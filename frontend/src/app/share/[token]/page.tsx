"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Download, Clock, Eye, AlertCircle, Loader2, Link2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface LinkInfo {
  title: string;
  file_type: string;
  expires_at: string;
  views: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const FILE_ICONS: Record<string, string> = {
  pdf: "📄", png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", webp: "🖼",
  svg: "🖼", txt: "📝", doc: "📝", docx: "📝",
};

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/tools/share/${token}/info`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Link not found");
        setInfo(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const fileUrl = `${API_BASE}/tools/share/${token}/file`;
  const icon = info ? (FILE_ICONS[info.file_type.toLowerCase()] ?? "📎") : "📎";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
            <Link2 size={13} className="text-blue-500" />
            <span className="font-medium">DocMan</span> — Shared Document
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-blue-500" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 mb-1">Link Unavailable</p>
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            </div>
          )}

          {info && !error && (
            <>
              {/* File header */}
              <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
                <div className="text-5xl mb-4">{icon}</div>
                <h1 className="text-xl font-bold text-gray-900 mb-1 break-words">{info.title}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                  {info.file_type}
                </span>
              </div>

              {/* Meta */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  Expires {formatDistanceToNow(new Date(info.expires_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={12} />
                  {info.views} view{info.views !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Download */}
              <div className="px-6 py-6 space-y-3">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Download size={16} />
                  Download File
                </a>

                {["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "txt"].includes(info.file_type.toLowerCase()) && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={16} />
                    View in Browser
                  </a>
                )}

                <p className="text-center text-xs text-gray-400 pt-1">
                  Link expires {format(new Date(info.expires_at), "MMM d, yyyy 'at' HH:mm")}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-medium text-gray-500">DocMan</span>
        </p>
      </div>
    </div>
  );
}
