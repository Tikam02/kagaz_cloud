"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, FileUp, Loader2 } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Collection {
  id: number;
  name: string;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  defaultCollectionId?: number;
}

export default function UploadModal({ open, onClose, onUploaded, defaultCollectionId }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [importantDate, setImportantDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [reminderDays, setReminderDays] = useState("30");
  const [tags, setTags] = useState("");
  const [collectionId, setCollectionId] = useState<string>(defaultCollectionId?.toString() || "");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      api.get("/collections").then((res) => setCollections(res.data.collections)).catch(() => {});
      if (defaultCollectionId) setCollectionId(defaultCollectionId.toString());
    }
  }, [open, defaultCollectionId]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    if (description) formData.append("description", description);
    if (category) formData.append("category", category);
    if (importantDate) formData.append("important_date", importantDate);
    if (dateLabel) formData.append("date_label", dateLabel);
    formData.append("reminder_days_before", reminderDays);
    if (tags) formData.append("tags", tags);
    if (collectionId) formData.append("collection_id", collectionId);

    setUploading(true);
    try {
      await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded!");
      onUploaded();
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setImportantDate("");
    setDateLabel("");
    setReminderDays("30");
    setTags("");
    setCollectionId(defaultCollectionId?.toString() || "");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <FileUp size={20} />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Drag & drop or click to select</p>
              </>
            )}
            <input ref={fileRef} type="file" onChange={handleFileChange} className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Auto-detect</option>
                <option value="license">License</option>
                <option value="bill">Bill</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
                <option value="contract">Contract</option>
                <option value="receipt">Receipt</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Important Date</label>
              <input type="date" value={importantDate} onChange={(e) => setImportantDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Label</label>
              <input type="text" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="e.g. Renewal Date" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remind Days Before</label>
              <input type="number" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} min="1" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. personal, 2024" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading & Analyzing...
              </>
            ) : (
              "Upload Document"
            )}
          </button>
        </form>

        {uploading && (
          <div className="absolute inset-0 bg-white/80 rounded-xl flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-700">Uploading & extracting metadata...</p>
            <p className="text-xs text-gray-400">Auto-filling title, description & tags</p>
          </div>
        )}
      </div>
    </div>
  );
}
