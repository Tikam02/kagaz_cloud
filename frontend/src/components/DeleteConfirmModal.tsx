"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function DeleteConfirmModal({
  docId,
  docTitle,
  onClose,
  onDeleted,
}: {
  docId: number;
  docTitle: string;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === "confirm";

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${docId}`);
      toast.success("Document deleted");
      onDeleted?.();
      onClose();
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle size={18} />
            Delete Document
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-600">
            You are about to permanently delete <strong>&quot;{docTitle}&quot;</strong>. This action cannot be undone.
          </p>

          <div className="mt-4">
            <label className="block text-sm text-gray-500 mb-1.5">
              Type <strong className="text-gray-900">confirm</strong> to delete
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="confirm"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              onKeyDown={(e) => e.key === "Enter" && canDelete && handleDelete()}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
