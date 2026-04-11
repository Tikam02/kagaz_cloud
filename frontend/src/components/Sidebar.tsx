"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, FileText, Receipt, FolderOpen, Plus, ChevronDown, ChevronRight, UserCircle, LogOut, FlaskConical, LifeBuoy, ShieldCheck, Search } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Collection {
  id: number;
  name: string;
  icon: string;
  color: string;
  document_count: number;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/documents", label: "All Documents", icon: FileText },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/tools", label: "Document Lab", icon: FlaskConical },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await api.get("/collections");
      setCollections(res.data.collections);
    } catch {}
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    try {
      await api.post("/collections", { name: newName.trim() });
      setNewName("");
      setShowCreate(false);
      fetchCollections();
    } catch {}
  };

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-tight">DocMan</h1>
        <p className="text-xs text-gray-400 mt-1">Document Manager</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            onClick={() => setCollectionsOpen(!collectionsOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <FolderOpen size={14} />
              Collections
            </span>
            {collectionsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {collectionsOpen && (
            <div className="space-y-1 mt-1">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === `/collections/${col.id}`
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.name}
                  </span>
                  <span className="text-xs text-gray-500">{col.document_count}</span>
                </Link>
              ))}

              {showCreate ? (
                <div className="px-3 py-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createCollection()}
                    placeholder="Collection name"
                    className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={createCollection} className="text-xs text-blue-400 hover:text-blue-300">Save</button>
                    <button onClick={() => { setShowCreate(false); setNewName(""); }} className="text-xs text-gray-500 hover:text-gray-400">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
                >
                  <Plus size={14} />
                  New Collection
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Admin link */}
      {user?.is_admin && (
        <div className="px-3 mt-2">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === "/admin"
                ? "bg-purple-600 text-white"
                : "text-purple-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <ShieldCheck size={18} />
            Admin Panel
          </Link>
        </div>
      )}

      {/* Bottom user section */}
      <div className="p-3 border-t border-gray-700 space-y-1">
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/profile"
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name ?? "Profile"}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email ?? ""}</p>
          </div>
          <UserCircle size={15} className="flex-shrink-0 opacity-60" />
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
