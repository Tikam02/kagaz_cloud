"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DocumentCard from "@/components/DocumentCard";
import UploadModal from "@/components/UploadModal";
import api from "@/lib/api";
import { ArrowLeft, Plus, Trash2, Settings } from "lucide-react";
import toast from "react-hot-toast";

interface Collection {
  id: number;
  name: string;
  description: string;
  color: string;
  document_count: number;
}

interface Document {
  id: number;
  title: string;
  category: string;
  file_type: string;
  file_size: number;
  important_date: string | null;
  date_label: string | null;
  created_at: string;
  tags: string[];
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchCollection();
  }, [params.id]);

  const fetchCollection = async () => {
    try {
      const res = await api.get(`/collections/${params.id}/documents`);
      setCollection(res.data.collection);
      setDocuments(res.data.documents);
      setName(res.data.collection.name);
    } catch {
      router.push("/dashboard");
    }
  };

  const handleRename = async () => {
    try {
      await api.put(`/collections/${params.id}`, { name });
      setEditing(false);
      fetchCollection();
    } catch {
      toast.error("Rename failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this collection? Documents will not be deleted.")) return;
    try {
      await api.delete(`/collections/${params.id}`);
      toast.success("Collection deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (!collection) return <AuthGuard><Sidebar /><Navbar /><main className="ml-64 mt-16 p-6"><div className="animate-pulse h-64 bg-gray-200 rounded-xl" /></main></AuthGuard>;

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: collection.color }} />
            {editing ? (
              <div className="flex items-center gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()} className="text-2xl font-bold border-b border-blue-500 focus:outline-none" autoFocus />
                <button onClick={handleRename} className="text-sm text-blue-600 hover:underline">Save</button>
                <button onClick={() => { setEditing(false); setName(collection.name); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus size={16} /> Upload
            </button>
            <button onClick={() => setEditing(true)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"><Settings size={18} /></button>
            <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"><Trash2 size={18} /></button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No documents in this collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onUpdate={fetchCollection} />
            ))}
          </div>
        )}

        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchCollection} defaultCollectionId={collection.id} />
      </main>
    </AuthGuard>
  );
}
