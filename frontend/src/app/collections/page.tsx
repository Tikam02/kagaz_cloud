"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface Collection {
  id: number;
  name: string;
  description: string;
  color: string;
  document_count: number;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await api.get("/collections");
      setCollections(res.data.collections);
    } catch {}
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await api.post("/collections", { name: name.trim(), description });
      setName("");
      setDescription("");
      setShowCreate(false);
      fetchCollections();
      toast.success("Collection created");
    } catch {
      toast.error("Failed to create collection");
    }
  };

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> New Collection
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="space-y-3">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {collections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FolderOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No collections yet. Create one to organize your documents!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => (
              <Link key={col.id} href={`/collections/${col.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="font-semibold text-gray-900">{col.name}</h3>
                </div>
                {col.description && <p className="text-sm text-gray-500 mb-2">{col.description}</p>}
                <p className="text-xs text-gray-400">{col.document_count} document{col.document_count !== 1 ? "s" : ""}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
