"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import {
  FilePlus2, Lock, Unlock, Share2, ImagePlus,
  ChevronUp, ChevronDown, X, Copy, Check, Trash2,
  Download, Link2, AlertCircle, Loader2, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";

/* ─────────────────────────────────────────────────────────── types ──── */
interface Doc {
  id: number;
  title: string;
  file_type: string;
  category: string;
}

interface ShareLinkRecord {
  token: string;
  document_id: number;
  document_title: string;
  expires_at: string;
  views_count: number;
  expired: boolean;
  created_at: string;
}

type ToolId = "merge" | "protect" | "unlock" | "share" | "image-to-pdf";

/* ─────────────────────────────────────────────────────────── tools ──── */
const TOOLS: { id: ToolId; label: string; desc: string; icon: React.ElementType; accent: string; bg: string; border: string }[] = [
  {
    id: "merge",
    label: "Merge PDFs",
    desc: "Combine multiple PDFs into one file",
    icon: FilePlus2,
    accent: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "protect",
    label: "Protect PDF",
    desc: "Add a password to lock a PDF",
    icon: Lock,
    accent: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  {
    id: "unlock",
    label: "Unlock PDF",
    desc: "Remove password from a protected PDF",
    icon: Unlock,
    accent: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  {
    id: "share",
    label: "Share Document",
    desc: "Generate a time-limited shareable link",
    icon: Share2,
    accent: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    id: "image-to-pdf",
    label: "Image → PDF",
    desc: "Convert images (PNG/JPG) to PDF",
    icon: ImagePlus,
    accent: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
];

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 1 },
  { label: "24 hours", value: 24 },
  { label: "3 days", value: 72 },
  { label: "7 days", value: 168 },
  { label: "30 days", value: 720 },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const SITE_BASE = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

/* ─────────────────────────────────────── reusable small components ──── */
function DocBadge({ ft }: { ft: string }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 uppercase">
      {ft}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{children}</p>;
}

/* ────────────────────────────────────────────── single doc picker ──── */
function SingleDocPicker({
  docs,
  value,
  onChange,
  placeholder = "Select a document…",
}: {
  docs: Doc[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  );
  const selected = docs.find((d) => d.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <DocBadge ft={selected.file_type} />
            <span className="truncate">{selected.title}</span>
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">No documents found</li>
            )}
            {filtered.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => { onChange(d.id); setOpen(false); setQuery(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <DocBadge ft={d.file_type} />
                  <span className="truncate">{d.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── multi doc picker ──── */
function MultiDocPicker({
  docs,
  selected,
  onChange,
  placeholder = "Add a document…",
}: {
  docs: Doc[];
  selected: Doc[];
  onChange: (docs: Doc[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(selected.map((d) => d.id));
  const available = docs.filter(
    (d) => !selectedIds.has(d.id) && d.title.toLowerCase().includes(query.toLowerCase())
  );

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...selected];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  const remove = (id: number) => onChange(selected.filter((d) => d.id !== id));

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
          {selected.map((doc, idx) => (
            <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-white text-sm">
              <span className="w-5 text-center text-xs text-gray-400 font-mono">{idx + 1}</span>
              <DocBadge ft={doc.file_type} />
              <span className="flex-1 truncate">{doc.title}</span>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronUp size={13} />
                </button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === selected.length - 1} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronDown size={13} />
                </button>
                <button type="button" onClick={() => remove(doc.id)} className="p-0.5 rounded hover:bg-red-50 text-red-500 ml-1">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 bg-gray-50"
        >
          <span>{placeholder}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {available.length === 0 && (
                <li className="px-3 py-4 text-sm text-gray-400 text-center">No more documents to add</li>
              )}
              {available.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => { onChange([...selected, d]); setOpen(false); setQuery(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                  >
                    <DocBadge ft={d.file_type} />
                    <span className="truncate">{d.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────── run button ──── */
function RunButton({ label, loading, onClick, accent = "bg-blue-600 hover:bg-blue-700" }: {
  label: string; loading: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${accent}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────────────── helper ──── */
async function triggerDownload(promise: Promise<{ data: Blob }>, filename: string) {
  const res = await promise;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════ main page ═══════ */
export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("merge");
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);

  // Merge
  const [mergeDocs, setMergeDocs] = useState<Doc[]>([]);

  // Protect
  const [protectDocId, setProtectDocId] = useState<number | null>(null);
  const [protectPw, setProtectPw] = useState("");
  const [protectPwConfirm, setProtectPwConfirm] = useState("");

  // Unlock
  const [unlockDocId, setUnlockDocId] = useState<number | null>(null);
  const [unlockPw, setUnlockPw] = useState("");

  // Image to PDF
  const [imgDocs, setImgDocs] = useState<Doc[]>([]);

  // Share
  const [shareDocId, setShareDocId] = useState<number | null>(null);
  const [shareExpiry, setShareExpiry] = useState(24);
  const [shareLinks, setShareLinks] = useState<ShareLinkRecord[]>([]);
  const [newLink, setNewLink] = useState<{ token: string; expires_at: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    api.get("/documents").then((r) => setAllDocs(r.data.documents || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTool === "share") fetchShareLinks();
  }, [activeTool]);

  const fetchShareLinks = () => {
    api.get("/tools/share/my").then((r) => setShareLinks(r.data.links || [])).catch(() => {});
  };

  const pdfDocs = allDocs.filter((d) => d.file_type.toLowerCase() === "pdf");
  const imageDocs = allDocs.filter((d) => ["png", "jpg", "jpeg", "gif", "webp"].includes(d.file_type.toLowerCase()));

  /* ── handlers ── */
  const handleMerge = async () => {
    if (mergeDocs.length < 2) return toast.error("Select at least 2 PDFs");
    setLoading(true);
    try {
      await triggerDownload(
        api.post("/tools/merge", { doc_ids: mergeDocs.map((d) => d.id) }, { responseType: "blob" }),
        "merged.pdf"
      );
      toast.success("PDFs merged successfully");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Merge failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProtect = async () => {
    if (!protectDocId) return toast.error("Select a PDF");
    if (!protectPw) return toast.error("Enter a password");
    if (protectPw !== protectPwConfirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const docTitle = pdfDocs.find((d) => d.id === protectDocId)?.title ?? "document";
      await triggerDownload(
        api.post("/tools/protect", { doc_id: protectDocId, password: protectPw }, { responseType: "blob" }),
        `${docTitle}_protected.pdf`
      );
      toast.success("PDF protected");
      setProtectPw(""); setProtectPwConfirm("");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Protection failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockDocId) return toast.error("Select a PDF");
    setLoading(true);
    try {
      const docTitle = pdfDocs.find((d) => d.id === unlockDocId)?.title ?? "document";
      await triggerDownload(
        api.post("/tools/unlock", { doc_id: unlockDocId, password: unlockPw }, { responseType: "blob" }),
        `${docTitle}_unlocked.pdf`
      );
      toast.success("PDF unlocked");
      setUnlockPw("");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Unlock failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImageToPdf = async () => {
    if (imgDocs.length === 0) return toast.error("Select at least one image");
    setLoading(true);
    try {
      await triggerDownload(
        api.post("/tools/image-to-pdf", { doc_ids: imgDocs.map((d) => d.id) }, { responseType: "blob" }),
        "converted.pdf"
      );
      toast.success("Converted to PDF");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Conversion failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareDocId) return toast.error("Select a document");
    setLoading(true);
    try {
      const res = await api.post("/tools/share", { doc_id: shareDocId, expiry_hours: shareExpiry });
      setNewLink(res.data);
      fetchShareLinks();
      toast.success("Share link created");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create link";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (token: string) => {
    try {
      await api.delete(`/tools/share/${token}`);
      toast.success("Link revoked");
      fetchShareLinks();
      if (newLink?.token === token) setNewLink(null);
    } catch {
      toast.error("Failed to revoke link");
    }
  };

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const activeTool_ = TOOLS.find((t) => t.id === activeTool)!;

  /* ─── tool workspace renderers ─── */
  const renderWorkspace = () => {
    switch (activeTool) {
      /* ── Merge ── */
      case "merge":
        return (
          <div className="space-y-5">
            <div>
              <SectionLabel>Select PDFs to merge (in order)</SectionLabel>
              <MultiDocPicker docs={pdfDocs} selected={mergeDocs} onChange={setMergeDocs} placeholder="+ Add PDF…" />
              {pdfDocs.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">No PDF documents in your library.</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <RunButton label={`Merge ${mergeDocs.length > 0 ? `${mergeDocs.length} PDFs` : "PDFs"}`} loading={loading} onClick={handleMerge} />
              {mergeDocs.length > 0 && (
                <button type="button" onClick={() => setMergeDocs([])} className="text-sm text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              )}
            </div>
          </div>
        );

      /* ── Protect ── */
      case "protect":
        return (
          <div className="space-y-5">
            <div>
              <SectionLabel>Select PDF</SectionLabel>
              <SingleDocPicker docs={pdfDocs} value={protectDocId} onChange={setProtectDocId} placeholder="Choose a PDF…" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SectionLabel>Password</SectionLabel>
                <input
                  type="password"
                  value={protectPw}
                  onChange={(e) => setProtectPw(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <SectionLabel>Confirm password</SectionLabel>
                <input
                  type="password"
                  value={protectPwConfirm}
                  onChange={(e) => setProtectPwConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
            <RunButton label="Protect & Download" loading={loading} onClick={handleProtect} accent="bg-red-600 hover:bg-red-700" />
          </div>
        );

      /* ── Unlock ── */
      case "unlock":
        return (
          <div className="space-y-5">
            <div>
              <SectionLabel>Select protected PDF</SectionLabel>
              <SingleDocPicker docs={pdfDocs} value={unlockDocId} onChange={setUnlockDocId} placeholder="Choose a PDF…" />
            </div>
            <div className="max-w-sm">
              <SectionLabel>Current password</SectionLabel>
              <input
                type="password"
                value={unlockPw}
                onChange={(e) => setUnlockPw(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <RunButton label="Unlock & Download" loading={loading} onClick={handleUnlock} accent="bg-green-600 hover:bg-green-700" />
          </div>
        );

      /* ── Image to PDF ── */
      case "image-to-pdf":
        return (
          <div className="space-y-5">
            <div>
              <SectionLabel>Select images (in order)</SectionLabel>
              <MultiDocPicker docs={imageDocs} selected={imgDocs} onChange={setImgDocs} placeholder="+ Add image…" />
              {imageDocs.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">No image documents in your library.</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <RunButton
                label={`Convert${imgDocs.length > 0 ? ` ${imgDocs.length} image${imgDocs.length > 1 ? "s" : ""}` : ""} to PDF`}
                loading={loading}
                onClick={handleImageToPdf}
                accent="bg-amber-600 hover:bg-amber-700"
              />
              {imgDocs.length > 0 && (
                <button type="button" onClick={() => setImgDocs([])} className="text-sm text-gray-400 hover:text-gray-600">Clear</button>
              )}
            </div>
          </div>
        );

      /* ── Share ── */
      case "share":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SectionLabel>Document to share</SectionLabel>
                <SingleDocPicker docs={allDocs} value={shareDocId} onChange={setShareDocId} placeholder="Choose a document…" />
              </div>
              <div>
                <SectionLabel>Link expiry</SectionLabel>
                <select
                  value={shareExpiry}
                  onChange={(e) => setShareExpiry(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <RunButton label="Create Shareable Link" loading={loading} onClick={handleShare} accent="bg-purple-600 hover:bg-purple-700" />

            {/* Newly created link */}
            {newLink && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                  <Link2 size={14} />
                  Link created — expires {formatDistanceToNow(new Date(newLink.expires_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-1.5 bg-white border border-purple-200 text-purple-900 rounded-lg text-xs font-mono truncate">
                    {`${SITE_BASE}/share/${newLink.token}`}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${SITE_BASE}/share/${newLink.token}`, newLink.token)}
                    className="flex-shrink-0 p-2 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors"
                    title="Copy link"
                  >
                    {copiedToken === newLink.token ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-purple-600" />}
                  </button>
                  <a
                    href={`/share/${newLink.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-2 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors"
                    title="Open link"
                  >
                    <ExternalLink size={14} className="text-purple-600" />
                  </a>
                </div>
              </div>
            )}

            {/* Active share links table */}
            {shareLinks.length > 0 && (
              <div>
                <SectionLabel>Your share links</SectionLabel>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left font-medium">Document</th>
                        <th className="px-4 py-2.5 text-left font-medium">Expires</th>
                        <th className="px-4 py-2.5 text-center font-medium">Views</th>
                        <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {shareLinks.map((lnk) => (
                        <tr key={lnk.token} className={lnk.expired ? "opacity-50" : ""}>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{lnk.document_title}</span>
                            {lnk.expired && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Expired</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {format(new Date(lnk.expires_at), "MMM d, yyyy HH:mm")}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{lnk.views_count}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!lnk.expired && (
                                <button
                                  onClick={() => copyToClipboard(`${SITE_BASE}/share/${lnk.token}`, lnk.token)}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                                  title="Copy link"
                                >
                                  {copiedToken === lnk.token ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                                </button>
                              )}
                              <button
                                onClick={() => handleRevoke(lnk.token)}
                                className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                title="Revoke"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Document Lab</h1>
          <p className="text-sm text-gray-500 mt-0.5">Process, protect, and share your documents</p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? `${tool.bg} ${tool.border} ring-2 ring-offset-1 ${tool.border.replace("border-", "ring-")}`
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className={`p-2 rounded-lg mb-3 ${isActive ? "bg-white/70" : tool.bg}`}>
                  <Icon size={18} className={tool.accent} />
                </div>
                <p className={`text-sm font-semibold ${isActive ? tool.accent : "text-gray-800"}`}>{tool.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{tool.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Workspace */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Workspace header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
            <div className={`p-2.5 rounded-xl ${activeTool_.bg}`}>
              <activeTool_.icon size={20} className={activeTool_.accent} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{activeTool_.label}</h2>
              <p className="text-xs text-gray-500">{activeTool_.desc}</p>
            </div>
          </div>

          {/* Tool notice for PDF tools when no PDFs exist */}
          {(activeTool === "merge" || activeTool === "protect" || activeTool === "unlock") && pdfDocs.length === 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-sm text-amber-800">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>No PDF documents found in your library. Upload some PDFs to use this tool.</span>
            </div>
          )}
          {activeTool === "image-to-pdf" && imageDocs.length === 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-sm text-amber-800">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>No image documents found in your library. Upload PNG/JPG images to use this tool.</span>
            </div>
          )}

          {renderWorkspace()}
        </div>
      </main>
    </AuthGuard>
  );
}
