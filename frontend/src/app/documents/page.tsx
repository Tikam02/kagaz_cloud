"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DocumentCard from "@/components/DocumentCard";
import UploadModal from "@/components/UploadModal";
import api from "@/lib/api";
import { Plus } from "lucide-react";

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

const categories = ["all", "license", "bill", "insurance", "tax", "contract", "receipt", "other"];

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <DocumentsContent />
    </Suspense>
  );
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [category, setCategory] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const search = searchParams.get("search") || "";

  useEffect(() => {
    fetchDocuments();
  }, [category, search]);

  const fetchDocuments = async () => {
    try {
      const params: Record<string, string> = {};
      if (category !== "all") params.category = category;
      if (search) params.search = search;
      const res = await api.get("/documents", { params });
      setDocuments(res.data.documents);
    } catch {}
  };

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Documents</h1>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Upload
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {search && (
          <p className="text-sm text-gray-500 mb-4">
            Search results for &quot;{search}&quot; ({documents.length} found)
          </p>
        )}

        {documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No documents found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onUpdate={fetchDocuments} />
            ))}
          </div>
        )}

        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchDocuments} />
      </main>
    </AuthGuard>
  );
}
