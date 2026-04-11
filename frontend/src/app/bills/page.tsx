"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DocumentCard from "@/components/DocumentCard";
import UploadModal from "@/components/UploadModal";
import api from "@/lib/api";
import { Plus, Receipt } from "lucide-react";

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

export default function BillsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await api.get("/documents", { params: { category: "bill" } });
      setDocuments(res.data.documents);
    } catch {}
  };

  const sorted = [...documents].sort((a, b) => {
    if (sortBy === "name") return a.title.localeCompare(b.title);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <div className="flex gap-2">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "name")} className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
            <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus size={16} /> Upload Bill
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Receipt size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No bills found. Upload a bill to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onUpdate={fetchBills} />
            ))}
          </div>
        )}

        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchBills} />
      </main>
    </AuthGuard>
  );
}
