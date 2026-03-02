"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { ArrowLeft, Download, Trash2, Save, FileText, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "", important_date: "", date_label: "", reminder_days_before: 30, collection_id: "", tags: "" });

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
        </div>
      </main>
    </AuthGuard>
  );
}
