"use client";

import { useEffect, useState } from "react";
import { X, FolderOpen, Loader2, Check } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Collection {
  id: number;
  name: string;
  icon: string;
  color: string;
  document_count: number;
}

export default function MoveToModal({
  docId,
  docTitle,
  onClose,
  onMoved,
}: {
  docId: number;
  docTitle: string;
  onClose: () => void;
  onMoved?: () => void;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    api.get("/collections")
      .then((res) => setCollections(res.data.collections))
      .catch(() => toast.error("Failed to load collections"))
      .finally(() => setLoading(false));
  }, []);

  const handleMove = async () => {
    setMoving(true);
    try {
      await api.put(`/documents/${docId}`, { collection_id: selected });
      toast.success("Document moved");
      onMoved?.();
      onClose();
    } catch {
      toast.error("Failed to move document");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Move &quot;{docTitle}&quot;</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No collections yet. Create one first.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {/* Option to remove from collection */}
              <button
                onClick={() => setSelected(null)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selected === null ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FolderOpen size={18} className="text-gray-400" />
                <span>No collection (root)</span>
                {selected === null && <Check size={16} className="ml-auto text-blue-600" />}
              </button>

              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelected(col.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selected === col.id ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ backgroundColor: col.color + "20", color: col.color }}>
                    <FolderOpen size={14} />
                  </div>
                  <span>{col.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{col.document_count}</span>
                  {selected === col.id && <Check size={16} className="text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={moving || (loading && collections.length === 0)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {moving && <Loader2 size={14} className="animate-spin" />}
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
