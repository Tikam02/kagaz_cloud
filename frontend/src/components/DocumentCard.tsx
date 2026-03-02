"use client";

import Link from "next/link";
import { FileText, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";

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

export default function DocumentCard({ doc }: { doc: Document }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
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
      </div>
    </Link>
  );
}
