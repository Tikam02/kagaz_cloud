"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Calendar, Tag, MoreVertical, Download, FolderInput, Share2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import MoveToModal from "./MoveToModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import ShareModal from "./ShareModal";

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

const categoryColors: Record<string, string> = {
  license: "bg-purple-100 text-purple-700",
  bill: "bg-green-100 text-green-700",
  insurance: "bg-yellow-100 text-yellow-700",
  tax: "bg-red-100 text-red-700",
  contract: "bg-blue-100 text-blue-700",
  receipt: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentCard({ doc, onUpdate }: { doc: Document; onUpdate?: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDownload = async () => {
    setMenuOpen(false);
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}.${doc.file_type}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <>
      <div
        onClick={() => router.push(`/documents/${doc.id}`)}
        className="relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[doc.category] || categoryColors.other}`}>
                {doc.category}
              </span>
              <span className="text-xs text-gray-400">{doc.file_type.toUpperCase()}</span>
              <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
            </div>
            {doc.important_date && (
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <Calendar size={12} />
                <span>{doc.date_label || "Important"}: {format(new Date(doc.important_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {doc.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                <Tag size={12} className="text-gray-400" />
                {doc.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Kebab menu */}
          <div ref={menuRef} className="relative flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setMoveOpen(true); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FolderInput size={15} className="text-gray-400" /> Move to
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download size={15} className="text-gray-400" /> Download
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShareOpen(true); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 size={15} className="text-gray-400" /> Share
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setDeleteOpen(true); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {moveOpen && <MoveToModal docId={doc.id} docTitle={doc.title} onClose={() => setMoveOpen(false)} onMoved={onUpdate} />}
      {deleteOpen && <DeleteConfirmModal docId={doc.id} docTitle={doc.title} onClose={() => setDeleteOpen(false)} onDeleted={onUpdate} />}
      {shareOpen && <ShareModal docId={doc.id} docTitle={doc.title} onClose={() => setShareOpen(false)} />}
    </>
  );
}
