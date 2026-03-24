"use client";

import { useEffect, useState, useMemo } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import UploadModal from "@/components/UploadModal";
import api from "@/lib/api";
import { FileText, Calendar, Clock, Plus, ArrowUpDown, ArrowUp, ArrowDown, Download, Eye } from "lucide-react";
import Link from "next/link";

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

type SortField = "title" | "category" | "status" | "reminder_date" | "created_at";
type SortDirection = "asc" | "desc";

type DocumentStatus = {
  label: string;
  color: string;
  priority: number;
};

function getDocumentStatus(important_date: string | null): DocumentStatus {
  if (!important_date) return { label: "No Reminder", color: "bg-gray-100 text-gray-500", priority: 4 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(important_date);
  due.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return { label: "Expired", color: "bg-red-100 text-red-700", priority: 0 };
  if (daysUntil <= 7) return { label: "Due Soon", color: "bg-orange-100 text-orange-700", priority: 1 };
  if (daysUntil <= 30) return { label: "Upcoming", color: "bg-yellow-100 text-yellow-700", priority: 2 };
  return { label: "Active", color: "bg-green-100 text-green-700", priority: 3 };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDirection }) {
  if (field !== sortField) return <ArrowUpDown size={14} className="text-gray-400" />;
  return sortDir === "asc" ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get("/documents");
      setDocuments(res.data.documents);
    } catch {}
  };

  const upcomingRenewals = documents.filter((d) => d.important_date);
  const thisWeek = documents.filter((d) => {
    const week = 7 * 24 * 60 * 60 * 1000;
    return new Date(d.created_at).getTime() > Date.now() - week;
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(documents.map((d) => d.category)));
    return cats.sort();
  }, [documents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedDocuments = useMemo(() => {
    let filtered = categoryFilter === "all" ? documents : documents.filter((d) => d.category === categoryFilter);
    return [...filtered].sort((a, b) => {
      const multiplier = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "title": return multiplier * a.title.localeCompare(b.title);
        case "category": return multiplier * a.category.localeCompare(b.category);
        case "status": return multiplier * (getDocumentStatus(a.important_date).priority - getDocumentStatus(b.important_date).priority);
        case "reminder_date": {
          if (!a.important_date && !b.important_date) return 0;
          if (!a.important_date) return 1;
          if (!b.important_date) return -1;
          return multiplier * (new Date(a.important_date).getTime() - new Date(b.important_date).getTime());
        }
        case "created_at": return multiplier * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        default: return 0;
      }
    });
  }, [documents, sortField, sortDir, categoryFilter]);

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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-sm text-gray-500">With Reminders</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Clock size={20} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{thisWeek.length}</p>
                <p className="text-sm text-gray-500">Uploaded This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Table Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">All Documents</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{sortedDocuments.length} documents</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Legend */}
          <div className="px-5 py-2 border-b border-gray-50 bg-gray-50/50 flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>Expired</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>Due Soon (&le;7d)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>Upcoming (&le;30d)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>Active</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>No Reminder</span>
          </div>

          {sortedDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No documents yet. Upload your first document!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-600 w-8">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      <button onClick={() => handleSort("title")} className="flex items-center gap-1.5 hover:text-gray-900">
                        Document <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      <button onClick={() => handleSort("category")} className="flex items-center gap-1.5 hover:text-gray-900">
                        Category <SortIcon field="category" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      <button onClick={() => handleSort("status")} className="flex items-center gap-1.5 hover:text-gray-900">
                        Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      <button onClick={() => handleSort("reminder_date")} className="flex items-center gap-1.5 hover:text-gray-900">
                        Reminder Date <SortIcon field="reminder_date" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      <button onClick={() => handleSort("created_at")} className="flex items-center gap-1.5 hover:text-gray-900">
                        Uploaded <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Size</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedDocuments.map((doc, idx) => {
                    const status = getDocumentStatus(doc.important_date);
                    return (
                      <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3 text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-semibold text-blue-600 uppercase">
                                {doc.file_type.slice(0, 3)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-[220px]">{doc.title}</p>
                              {doc.tags.length > 0 && (
                                <p className="text-xs text-gray-400 truncate max-w-[220px]">{doc.tags.join(", ")}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {doc.important_date ? (
                            <div>
                              <p className="font-medium">{new Date(doc.important_date).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              {doc.date_label && <p className="text-xs text-gray-400">{doc.date_label}</p>}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View"
                            >
                              <Eye size={15} />
                            </Link>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/documents/${doc.id}/download`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Download"
                            >
                              <Download size={15} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchDocuments} />
      </main>
    </AuthGuard>
  );
}
