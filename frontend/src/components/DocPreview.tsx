"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { FileText, AlertCircle, Loader2, Maximize2, Minimize2 } from "lucide-react";

interface DocPreviewProps {
  docId: number;
  fileType: string;
  title: string;
}

const IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const PDF_TYPE = "pdf";
const TEXT_TYPE = "txt";

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; objectUrl: string; kind: "pdf" | "image" | "text"; text?: string }
  | { status: "unsupported" }
  | { status: "error"; message: string };

export default function DocPreview({ docId, fileType, title }: DocPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [expanded, setExpanded] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const ft = fileType.toLowerCase();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ status: "loading" });

      // Only attempt fetch for supported types
      const isSupported = ft === PDF_TYPE || IMAGE_TYPES.has(ft) || ft === TEXT_TYPE;
      if (!isSupported) {
        setState({ status: "unsupported" });
        return;
      }

      try {
        const res = await api.get(`/documents/${docId}/preview`, {
          responseType: "blob",
        });

        if (cancelled) return;

        const blob: Blob = res.data;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        if (ft === PDF_TYPE) {
          setState({ status: "ready", objectUrl: url, kind: "pdf" });
        } else if (IMAGE_TYPES.has(ft)) {
          setState({ status: "ready", objectUrl: url, kind: "image" });
        } else if (ft === TEXT_TYPE) {
          const text = await blob.text();
          setState({ status: "ready", objectUrl: url, kind: "text", text });
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to load preview.";
        setState({ status: "error", message: msg });
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [docId, ft]);

  // -------------------------------------------------------------------------
  // Skeleton / loading
  // -------------------------------------------------------------------------
  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200 gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <span className="text-sm">Loading preview…</span>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Unsupported file type
  // -------------------------------------------------------------------------
  if (state.status === "unsupported") {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-300 gap-3 text-gray-400">
        <FileText size={36} className="text-gray-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">No preview available</p>
          <p className="text-xs text-gray-400 mt-0.5">
            .{ft.toUpperCase()} files cannot be previewed — download to view.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error
  // -------------------------------------------------------------------------
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-red-50 rounded-xl border border-red-200 gap-3">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-red-600">{state.message}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Ready — render by kind
  // -------------------------------------------------------------------------
  const { objectUrl, kind, text } = state;

  const containerCls = expanded
    ? "fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
    : "relative";

  const innerCls = expanded
    ? "w-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col"
    : "bg-white rounded-xl border border-gray-200 overflow-hidden";

  const previewHeight = expanded ? "calc(100vh - 8rem)" : "600px";

  return (
    <div className={containerCls}>
      {expanded && (
        // Backdrop click closes expanded view
        <div className="absolute inset-0" onClick={() => setExpanded(false)} />
      )}
      <div className={innerCls} style={{ position: "relative" }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
              {ft}
            </span>
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

        {/* Content */}
        {kind === "pdf" && (
          <iframe
            src={objectUrl}
            title={title}
            style={{ width: "100%", height: previewHeight, border: "none", display: "block" }}
          />
        )}

        {kind === "image" && (
          <div
            className="flex items-center justify-center bg-gray-100 overflow-auto"
            style={{ minHeight: expanded ? previewHeight : "400px", maxHeight: previewHeight }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrl}
              alt={title}
              className="max-w-full max-h-full object-contain p-4"
            />
          </div>
        )}

        {kind === "text" && (
          <div
            className="overflow-auto bg-gray-900 text-green-400"
            style={{ height: previewHeight }}
          >
            <pre className="p-5 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words">
              {text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
