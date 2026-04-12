"""
Automatic metadata extraction from documents using Docling.

Supported formats: PDF, DOCX, PPTX, XLSX, HTML, images, and more.
Extracts: title, dates (expiry, deadline, issue), headline/subject,
parties/names, amounts, and a short summary.
"""

import re
import logging
import threading
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

# Docling imports are deferred to _get_converter() so that importing this
# module does NOT load 1.5 GB of ML model weights at startup (gunicorn OOM-kill prevention).

logger = logging.getLogger(__name__)

# -- Singleton converter (avoids reloading ML models every call) --
_converter = None
_converter_lock = threading.Lock()

EXTRACTION_TIMEOUT_SECONDS = 60  # max time for a single extraction


def _get_converter():
    global _converter
    if _converter is None:
        with _converter_lock:
            if _converter is None:
                # Lazy import: defer heavy model loading until first actual use
                from docling.document_converter import DocumentConverter, PdfFormatOption
                from docling.datamodel.base_models import InputFormat
                from docling.datamodel.pipeline_options import PdfPipelineOptions
                from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions

                logger.info("Initializing DocumentConverter (one-time model load)...")
                pdf_opts = PdfPipelineOptions(
                    do_table_structure=False,
                    do_ocr=False,
                    accelerator_options=AcceleratorOptions(
                        device=AcceleratorDevice.CPU,
                    ),
                )
                _converter = DocumentConverter(
                    format_options={
                        InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_opts),
                    }
                )
    return _converter

# Common date patterns (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, Month DD YYYY, etc.)
DATE_PATTERNS = [
    # YYYY-MM-DD
    (r"\b(\d{4}-\d{2}-\d{2})\b", "%Y-%m-%d"),
    # DD/MM/YYYY or DD-MM-YYYY
    (r"\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b", None),
    # Month DD, YYYY
    (r"\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b", None),
    # DD Month YYYY
    (r"\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b", None),
]

DATE_LABEL_KEYWORDS = {
    "expiry": ["expiry date", "expiration date", "expires on", "valid until", "valid till", "exp date", "expiring"],
    "deadline": ["deadline", "due date", "due on", "last date", "submit by", "submission date"],
    "issue_date": ["issue date", "issued on", "date of issue", "issued"],
    "effective_date": ["effective date", "effective from", "commencing on", "start date"],
    "renewal_date": ["renewal date", "renew by", "renewal due"],
    "payment_due": ["payment due", "pay by", "payment date", "billing date"],
}

AMOUNT_PATTERN = re.compile(
    r"(?:Rs\.?|INR|USD|\$|₹|€|£)\s*[\d,]+(?:\.\d{2})?|\b[\d,]+(?:\.\d{2})?\s*(?:Rs\.?|INR|USD|rupees|dollars)",
    re.IGNORECASE,
)

# Patterns to strip from extracted document text
_CLEAN_PATTERNS = [
    # HTML comments: <!-- image -->, <!-- ... -->
    re.compile(r"<!--.*?-->", re.DOTALL),
    # HTML tags that leak through: <img>, <br>, <div>, etc.
    re.compile(r"<[^>]+>"),
    # Markdown image syntax: ![alt](url)
    re.compile(r"!\[[^\]]*\]\([^)]*\)"),
    # Repeated whitespace / blank lines left after stripping
    re.compile(r"\n\s*\n\s*\n+"),
]


def _clean_text(text: str) -> str:
    """Remove HTML comments, image placeholders, and conversion artifacts."""
    for pattern in _CLEAN_PATTERNS:
        text = pattern.sub("\n", text) if pattern.groups == 0 else pattern.sub("\n", text)
    # Collapse runs of whitespace on each line but keep line structure
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped:
            lines.append(stripped)
    return "\n".join(lines)


def _parse_date(date_str: str) -> str | None:
    """Try to parse a date string into ISO format."""
    date_str = date_str.replace(",", "").strip()
    for fmt in [
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
        "%B %d %Y", "%d %B %Y", "%b %d %Y", "%d %b %Y",
    ]:
        try:
            return datetime.strptime(date_str, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _extract_dates_with_context(text: str) -> list[dict]:
    """Extract dates and attempt to label them based on surrounding text."""
    results = []
    seen = set()

    for pattern, _ in DATE_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1)
            parsed = _parse_date(raw)
            if not parsed or parsed in seen:
                continue
            seen.add(parsed)

            # Look at the 120 chars before the date for context
            start = max(0, match.start() - 120)
            context = text[start:match.start()].lower()

            label = "date"
            for lbl, keywords in DATE_LABEL_KEYWORDS.items():
                if any(kw in context for kw in keywords):
                    label = lbl
                    break

            results.append({"date": parsed, "label": label, "raw": raw})

    return results


def _extract_amounts(text: str) -> list[str]:
    """Extract monetary amounts from text."""
    matches = AMOUNT_PATTERN.findall(text)
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for m in matches:
        m = m.strip()
        if m not in seen:
            seen.add(m)
            unique.append(m)
    return unique[:10]  # Limit to 10


def _extract_headline(text: str) -> str | None:
    """Extract the first meaningful line as a headline/subject."""
    for line in text.split("\n"):
        line = line.strip()
        if len(line) > 10 and not line.startswith("#"):
            return line[:200]
    return None


def _generate_summary(text: str, max_chars: int = 300) -> str:
    """Generate a 2-3 line extractive summary."""
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
    summary = ""
    for p in paragraphs:
        if len(summary) + len(p) + 1 > max_chars:
            break
        summary += (" " if summary else "") + p
    if not summary:
        summary = text[:max_chars]
    # Trim to last sentence boundary if possible
    last_period = summary.rfind(".")
    if last_period > max_chars // 2:
        summary = summary[: last_period + 1]
    return summary.strip()


# Keywords for auto-tagging
TAG_KEYWORDS = {
    "license": ["license", "licence", "permit", "certification", "registration"],
    "insurance": ["insurance", "policy", "coverage", "premium", "claim"],
    "tax": ["tax", "gst", "income tax", "itr", "tds", "pan"],
    "bill": ["bill", "invoice", "utility", "electricity", "water", "gas", "broadband"],
    "receipt": ["receipt", "payment receipt", "acknowledgement"],
    "contract": ["contract", "agreement", "lease", "rental", "mou"],
    "government": ["government", "govt", "ministry", "authority", "fssai", "municipal"],
    "medical": ["medical", "hospital", "prescription", "diagnosis", "health"],
    "education": ["education", "university", "college", "school", "degree", "certificate"],
    "financial": ["bank", "loan", "emi", "interest", "deposit", "cheque", "transaction"],
    "vehicle": ["vehicle", "car", "bike", "driving", "rc", "pollution"],
    "property": ["property", "land", "house", "flat", "deed", "registry"],
    "renewal": ["renewal", "renew", "expiry", "expiration", "valid until"],
}


def _extract_tags(text: str) -> list[str]:
    """Extract relevant tags from text based on keyword matching."""
    text_lower = text.lower()
    tags = []
    for tag, keywords in TAG_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            tags.append(tag)
    return tags[:8]


def extract_metadata(file_path: str) -> dict:
    """
    Extract metadata from a document using Docling.

    Returns a dict with:
      - headline: first meaningful line / title
      - dates: list of {date, label, raw}
      - amounts: list of monetary amounts found
      - summary: short extractive summary
      - page_count: number of pages (if available)
      - doc_metadata: embedded metadata from the file (author, title, etc.)
      - full_text_preview: first 1000 chars of extracted text
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        converter = _get_converter()

        # Run conversion with a timeout to avoid hanging on problematic files
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(converter.convert, str(path))
            try:
                result = future.result(timeout=EXTRACTION_TIMEOUT_SECONDS)
            except FuturesTimeoutError:
                future.cancel()
                logger.warning("Metadata extraction timed out for %s", file_path)
                return {
                    "error": f"Extraction timed out after {EXTRACTION_TIMEOUT_SECONDS}s",
                    "headline": None,
                    "dates": [],
                    "amounts": [],
                    "summary": None,
                    "page_count": None,
                    "doc_metadata": {},
                    "full_text_preview": None,
                }

        doc = result.document

        # Get full text and clean conversion artifacts
        raw_text = doc.export_to_markdown()
        full_text = _clean_text(raw_text) if raw_text else ""

        # Embedded document metadata
        doc_meta = {}
        if hasattr(doc, "origin") and doc.origin:
            origin = doc.origin
            for attr in ["filename", "mimetype"]:
                val = getattr(origin, attr, None)
                if val:
                    doc_meta[attr] = val

        # Extract structured fields
        dates = _extract_dates_with_context(full_text)
        amounts = _extract_amounts(full_text)
        headline = _extract_headline(full_text)
        summary = _generate_summary(full_text)
        tags = _extract_tags(full_text)

        # Page count if available
        page_count = None
        if hasattr(doc, "pages"):
            page_count = len(doc.pages)

        metadata = {
            "headline": headline,
            "dates": dates,
            "amounts": amounts,
            "summary": summary,
            "tags": tags,
            "page_count": page_count,
            "doc_metadata": doc_meta,
            "full_text": full_text or "",
            "full_text_preview": full_text[:1000] if full_text else None,
        }

        return metadata

    except Exception as e:
        logger.exception("Failed to extract metadata from %s", file_path)
        return {
            "error": str(e),
            "headline": None,
            "dates": [],
            "amounts": [],
            "summary": None,
            "page_count": None,
            "doc_metadata": {},
            "full_text_preview": None,
        }
