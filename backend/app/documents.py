import os
import uuid
import logging
import threading
from datetime import date
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Document
from .extract_metadata import extract_metadata
from . import search as search_service

logger = logging.getLogger(__name__)

documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")

CATEGORY_KEYWORDS = {
    "license": ["license", "permit", "certification", "certified"],
    "bill": ["bill", "invoice", "payment", "utility", "electricity", "water", "gas"],
    "insurance": ["insurance", "policy", "coverage", "claim"],
    "tax": ["tax", "w2", "w-2", "1099", "return", "irs"],
    "contract": ["contract", "agreement", "lease", "rental"],
    "receipt": ["receipt", "purchase", "order"],
}


def detect_category(title, filename):
    text = f"{title} {filename}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "other"


@documents_bp.route("", methods=["GET"])
@jwt_required()
def list_documents():
    user_id = int(get_jwt_identity())
    query = Document.query.filter_by(user_id=user_id)

    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category)

    collection_id = request.args.get("collection_id")
    if collection_id:
        query = query.filter_by(collection_id=int(collection_id))

    search = request.args.get("search")
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                Document.title.ilike(pattern),
                Document.description.ilike(pattern),
                Document.category.ilike(pattern),
                Document.date_label.ilike(pattern),
                Document.tags.cast(db.String).ilike(pattern),
                Document.metadata_extracted.cast(db.String).ilike(pattern),
            )
        )

    documents = query.order_by(Document.created_at.desc()).all()
    return jsonify({"documents": [d.to_dict() for d in documents]})


@documents_bp.route("", methods=["POST"])
@jwt_required()
def create_document():
    user_id = int(get_jwt_identity())

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    title = request.form.get("title", file.filename)
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_name)
    file.save(file_path)

    file_size = os.path.getsize(file_path)
    category = request.form.get("category") or detect_category(title, file.filename)

    important_date = request.form.get("important_date")
    if important_date:
        important_date = date.fromisoformat(important_date)

    tags = request.form.get("tags")
    if tags:
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    else:
        tags = []

    collection_id = request.form.get("collection_id")
    if collection_id:
        collection_id = int(collection_id)

    doc = Document(
        user_id=user_id,
        title=title,
        description=request.form.get("description", ""),
        file_path=unique_name,
        file_type=ext.lstrip(".") if ext else "unknown",
        file_size=file_size,
        category=category,
        tags=tags,
        important_date=important_date,
        date_label=request.form.get("date_label"),
        reminder_days_before=int(request.form.get("reminder_days_before", 30)),
        collection_id=collection_id,
    )
    db.session.add(doc)
    db.session.commit()

    # Extract metadata synchronously and auto-fill empty fields
    abs_path = os.path.join(upload_dir, unique_name)
    full_text = None
    try:
        metadata = extract_metadata(abs_path)
        doc.metadata_extracted = metadata
        full_text = metadata.get("full_text")

        # Auto-fill title if user just used the filename
        if metadata.get("headline") and title == file.filename:
            doc.title = metadata["headline"][:200]

        # Auto-fill description from summary
        if not doc.description and metadata.get("summary"):
            doc.description = metadata["summary"][:500]

        # Auto-fill tags
        if not doc.tags and metadata.get("tags"):
            doc.tags = metadata["tags"]

        # Auto-fill important_date from first date found
        if not doc.important_date and metadata.get("dates"):
            first = metadata["dates"][0]
            try:
                doc.important_date = date.fromisoformat(first["date"])
                doc.date_label = first.get("label", "date")
            except (ValueError, KeyError):
                pass

        db.session.commit()
    except Exception:
        logger.warning("Metadata extraction failed for doc %s", doc.id, exc_info=True)

    # Index in OpenSearch for full-text search
    search_service.index_document(doc, full_text=full_text)

    return jsonify({"document": doc.to_dict()}), 201


@documents_bp.route("/<int:doc_id>", methods=["GET"])
@jwt_required()
def get_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    return jsonify({"document": doc.to_dict()})


@documents_bp.route("/<int:doc_id>", methods=["PUT"])
@jwt_required()
def update_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json()
    for field in ["title", "description", "category", "date_label"]:
        if field in data:
            setattr(doc, field, data[field])

    if "important_date" in data:
        doc.important_date = date.fromisoformat(data["important_date"]) if data["important_date"] else None

    if "reminder_days_before" in data:
        doc.reminder_days_before = int(data["reminder_days_before"])

    if "tags" in data:
        doc.tags = data["tags"]

    if "collection_id" in data:
        doc.collection_id = data["collection_id"]

    db.session.commit()

    # Update OpenSearch index
    search_service.update_document(doc)

    return jsonify({"document": doc.to_dict()})


@documents_bp.route("/<int:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(doc)
    db.session.commit()

    # Remove from OpenSearch index
    search_service.delete_document(doc_id, user_id)

    return jsonify({"message": "Document deleted"})


@documents_bp.route("/<int:doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.file_path)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(file_path, as_attachment=True, download_name=f"{doc.title}.{doc.file_type}")


@documents_bp.route("/<int:doc_id>/preview", methods=["GET"])
@jwt_required()
def preview_document(doc_id):
    """Serve the file inline so the browser can render it (PDF, image, etc.)."""
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.file_path)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on disk"}), 404

    # MIME type map for common document/image types
    mime_map = {
        "pdf":  "application/pdf",
        "png":  "image/png",
        "jpg":  "image/jpeg",
        "jpeg": "image/jpeg",
        "gif":  "image/gif",
        "webp": "image/webp",
        "svg":  "image/svg+xml",
        "txt":  "text/plain",
    }
    mime = mime_map.get(doc.file_type.lower(), "application/octet-stream")

    return send_file(
        file_path,
        mimetype=mime,
        as_attachment=False,          # inline — let the browser render it
        download_name=f"{doc.title}.{doc.file_type}",
    )


@documents_bp.route("/<int:doc_id>/metadata", methods=["GET"])
@jwt_required()
def get_metadata(doc_id):
    """Return the extracted metadata for a document."""
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    return jsonify({"metadata": doc.metadata_extracted})


@documents_bp.route("/<int:doc_id>/metadata/extract", methods=["POST"])
@jwt_required()
def reextract_metadata(doc_id):
    """Re-extract metadata from the document file using Docling (async)."""
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.file_path)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on disk"}), 404

    # Clear old metadata and run extraction in background
    doc.metadata_extracted = None
    db.session.commit()

    def _bg_reextract(app, d_id, fpath):
        with app.app_context():
            try:
                metadata = extract_metadata(fpath)
                d = db.session.get(Document, d_id)
                if d:
                    d.metadata_extracted = metadata
                    db.session.commit()
            except Exception:
                logger.exception("Metadata re-extraction failed for doc %s", d_id)

    app = current_app._get_current_object()
    threading.Thread(target=_bg_reextract, args=(app, doc.id, file_path), daemon=True).start()

    return jsonify({"status": "extracting", "message": "Extraction started, poll GET /metadata for results"}), 202
