"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DocumentCard from "@/components/DocumentCard";
import UploadModal from "@/components/UploadModal";
import api from "@/lib/api";
import { FileText, Calendar, Clock, Plus } from "lucide-react";

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

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get("/documents");
      setDocuments(res.data.documents);
    } catch {}
  };

  const upcomingRenewals = documents
    .filter((d) => d.important_date)
    .sort((a, b) => new Date(a.important_date!).getTime() - new Date(b.important_date!).getTime())
    .slice(0, 5);

  const recentDocuments = documents.slice(0, 6);

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Upload Document
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FileText size={20} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                <p className="text-sm text-gray-500">Total Documents</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Calendar size={20} className="text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{upcomingRenewals.length}</p>
                <p className="text-sm text-gray-500">Upcoming Renewals</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Clock size={20} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{documents.filter((d) => {
                  const week = 7 * 24 * 60 * 60 * 1000;
                  return new Date(d.created_at).getTime() > Date.now() - week;
                }).length}</p>
                <p className="text-sm text-gray-500">Uploaded This Week</p>
              </div>
            </div>
          </div>
        </div>

        {upcomingRenewals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Renewals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingRenewals.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Documents</h2>
          {recentDocuments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No documents yet. Upload your first document!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentDocuments.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>

        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchDocuments} />
      </main>
    </AuthGuard>
  );
}
