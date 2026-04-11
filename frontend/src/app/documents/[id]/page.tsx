"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { ArrowLeft, Download, Trash2, Save, FileText, Calendar, Eye, Sparkles, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import DocPreview from "@/components/DocPreview";

interface MetadataDate {
  date: string;
  label: string;
  raw: string;
}

interface DocumentMetadata {
  headline: string | null;
  dates: MetadataDate[];
  amounts: string[];
  summary: string | null;
  page_count: number | null;
  doc_metadata: Record<string, string>;
  full_text_preview: string | null;
  error?: string;
}

interface Document {
  id: number;
  title: string;
  description: string;
  category: string;
  file_type: string;
  file_size: number;
  important_date: string | null;
  date_label: string | null;
  reminder_days_before: number;
  collection_id: number | null;
  tags: string[];
  metadata_extracted: DocumentMetadata | null;
  created_at: string;
  updated_at: string;
}

interface Collection {
  id: number;
  name: string;
}

const categoryColors: Record<string, string> = {
  license: "bg-purple-100 text-purple-700",
  bill: "bg-green-100 text-green-700",
  insurance: "bg-yellow-100 text-yellow-700",
  tax: "bg-red-100 text-red-700",
  contract: "bg-blue-100 text-blue-700",
  receipt: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "", important_date: "", date_label: "", reminder_days_before: 30, collection_id: "", tags: "" });
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    fetchDocument();
    api.get("/collections").then((r) => setCollections(r.data.collections)).catch(() => {});
  }, [params.id]);

  const fetchDocument = async () => {
    try {
      const res = await api.get(`/documents/${params.id}`);
      const d = res.data.document;
      setDoc(d);
      setForm({
        title: d.title,
        description: d.description || "",
        category: d.category,
        important_date: d.important_date || "",
        date_label: d.date_label || "",
        reminder_days_before: d.reminder_days_before,
        collection_id: d.collection_id?.toString() || "",
        tags: (d.tags || []).join(", "),
      });
    } catch {
      toast.error("Document not found");
      router.push("/documents");
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/documents/${params.id}`, {
        title: form.title,
        description: form.description,
        category: form.category,
        important_date: form.important_date || null,
        date_label: form.date_label,
        reminder_days_before: form.reminder_days_before,
        collection_id: form.collection_id ? parseInt(form.collection_id) : null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Document updated");
      setEditing(false);
      fetchDocument();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${params.id}`);
      toast.success("Document deleted");
      router.push("/documents");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/documents/${params.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc?.title || "document"}.${doc?.file_type || "file"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleShowMetadata = async () => {
    setShowMetadata(true);
    // Use cached metadata if available
    if (doc?.metadata_extracted) {
      setMetadata(doc.metadata_extracted);
      return;
    }
    // Otherwise trigger extraction
    await handleExtractMetadata();
  };

  const handleExtractMetadata = async () => {
    setExtracting(true);
    try {
      await api.post(`/documents/${params.id}/metadata/extract`);
      // Poll for results since extraction runs in background
      const pollInterval = setInterval(async () => {
        try {
          const res = await api.get(`/documents/${params.id}/metadata`);
          if (res.data.metadata) {
            clearInterval(pollInterval);
            setMetadata(res.data.metadata);
            fetchDocument();
            toast.success("Metadata extracted");
            setExtracting(false);
          }
        } catch {
          clearInterval(pollInterval);
          toast.error("Metadata extraction failed");
          setExtracting(false);
        }
      }, 2000);
      // Stop polling after 90s
      setTimeout(() => {
        clearInterval(pollInterval);
        if (extracting) {
          toast.error("Metadata extraction timed out");
          setExtracting(false);
        }
      }, 90000);
    } catch {
      toast.error("Metadata extraction failed");
      setExtracting(false);
    }
  };

  if (!doc) return <AuthGuard><Sidebar /><Navbar /><main className="ml-64 mt-16 p-6"><div className="animate-pulse h-64 bg-gray-200 rounded-xl" /></main></AuthGuard>;

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg"><FileText size={24} className="text-blue-600" /></div>
              <div>
                {editing ? (
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="text-xl font-bold border-b border-blue-500 focus:outline-none" />
                ) : (
                  <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[doc.category] || categoryColors.other}`}>
                    {doc.category}
                  </span>
                  <span className="text-xs text-gray-400">{doc.file_type.toUpperCase()}</span>
                  <span className="text-xs text-gray-400">Uploaded {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><Download size={14} /> Download</button>
              <button onClick={handleShowMetadata} className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"><Sparkles size={14} /> See Metadata</button>
              <button
                onClick={() => setShowPreview((p) => !p)}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${showPreview ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                <Eye size={14} /> {showPreview ? "Hide Preview" : "Preview"}
              </button>
              {editing ? (
                <button onClick={handleSave} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={14} /> Save</button>
              ) : (
                <button onClick={() => setEditing(true)} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
              )}
              <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                {editing ? (
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <p className="text-sm text-gray-700">{doc.description || "No description"}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                {editing ? (
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["license", "bill", "insurance", "tax", "contract", "receipt", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <span className="capitalize text-sm text-gray-700">{doc.category}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tags</label>
                {editing ? (
                  <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="comma-separated" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {(doc.tags || []).length > 0 ? doc.tags.map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
                    )) : <span className="text-sm text-gray-400">No tags</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Important Date</label>
                {editing ? (
                  <input type="date" value={form.important_date} onChange={(e) => setForm({ ...form, important_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : doc.important_date ? (
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Calendar size={14} />
                    {doc.date_label || "Date"}: {format(new Date(doc.important_date), "MMM d, yyyy")}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not set</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date Label</label>
                {editing ? (
                  <input value={form.date_label} onChange={(e) => setForm({ ...form, date_label: e.target.value })} placeholder="e.g. Renewal Date" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <span className="text-sm text-gray-700">{doc.date_label || "Not set"}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Collection</label>
                {editing ? (
                  <select value={form.collection_id} onChange={(e) => setForm({ ...form, collection_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <span className="text-sm text-gray-700">
                    {doc.collection_id ? collections.find((c) => c.id === doc.collection_id)?.name || "Unknown" : "None"}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Reminder</label>
                {editing ? (
                  <input type="number" value={form.reminder_days_before} onChange={(e) => setForm({ ...form, reminder_days_before: parseInt(e.target.value) })} min="1" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <span className="text-sm text-gray-700">{doc.reminder_days_before} days before</span>
                )}
              </div>
            </div>
          </div>

          {showPreview && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Eye size={14} /> Document Preview
              </h2>
              <DocPreview docId={doc.id} fileType={doc.file_type} title={doc.title} />
            </div>
          )}
        </div>

        {/* Metadata Modal */}
        {showMetadata && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMetadata(false)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Sparkles size={18} className="text-purple-600" /> Extracted Metadata</h2>
                <div className="flex items-center gap-2">
                  <button onClick={handleExtractMetadata} disabled={extracting} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50">
                    <RefreshCw size={12} className={extracting ? "animate-spin" : ""} /> {extracting ? "Extracting..." : "Re-extract"}
                  </button>
                  <button onClick={() => setShowMetadata(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>

              {extracting && !metadata ? (
                <div className="p-10 text-center">
                  <RefreshCw size={24} className="animate-spin mx-auto text-purple-500 mb-3" />
                  <p className="text-sm text-gray-500">Analyzing document with Docling...</p>
                </div>
              ) : metadata ? (
                <div className="p-5 space-y-5">
                  {metadata.error && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">Extraction error: {metadata.error}</div>
                  )}

                  {metadata.headline && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Headline / Subject</h3>
                      <p className="text-sm text-gray-800 font-medium">{metadata.headline}</p>
                    </div>
                  )}

                  {metadata.dates && metadata.dates.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dates Found</h3>
                      <div className="space-y-1.5">
                        {metadata.dates.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-blue-500" />
                            <span className="capitalize font-medium text-gray-600 min-w-[100px]">{d.label.replace(/_/g, " ")}:</span>
                            <span className="text-gray-800">{d.date}</span>
                            <span className="text-xs text-gray-400">({d.raw})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {metadata.amounts && metadata.amounts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amounts</h3>
                      <div className="flex flex-wrap gap-2">
                        {metadata.amounts.map((a, i) => (
                          <span key={i} className="text-sm bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {metadata.page_count && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pages</h3>
                      <p className="text-sm text-gray-700">{metadata.page_count}</p>
                    </div>
                  )}

                  {metadata.doc_metadata && Object.keys(metadata.doc_metadata).length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">File Metadata</h3>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        {Object.entries(metadata.doc_metadata).map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-sm">
                            <span className="font-medium text-gray-500 capitalize min-w-[80px]">{k}:</span>
                            <span className="text-gray-700">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {metadata.summary && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Summary</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{metadata.summary}</p>
                    </div>
                  )}

                  {metadata.full_text_preview && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Text Preview</h3>
                      <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">{metadata.full_text_preview}</pre>
                    </div>
                  )}

                  {!metadata.headline && !metadata.dates?.length && !metadata.amounts?.length && !metadata.summary && !metadata.error && (
                    <p className="text-sm text-gray-400 text-center py-4">No metadata could be extracted from this document.</p>
                  )}
                </div>
              ) : (
                <div className="p-10 text-center text-sm text-gray-400">No metadata available. Click &quot;Re-extract&quot; to analyze.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
