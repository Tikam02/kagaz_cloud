"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

import {
  Users,
  FileText,
  FolderOpen,
  HardDrive,
  Ticket,
  Shield,
  ShieldOff,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

interface Stats {
  users: { total: number; new_30d: number; new_7d: number; active_7d: number; active_30d: number };
  documents: { total: number; total_storage_bytes: number; by_category: Record<string, number> };
  collections: { total: number };
  tickets: { open: number; total: number };
  signups_by_day: { day: string; count: number }[];
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  last_login: string | null;
  created_at: string;
  document_count: number;
  collection_count: number;
}

interface TicketItem {
  id: number;
  user_name: string;
  user_email: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
}

type Tab = "overview" | "users" | "tickets";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon size={20} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPages, setTicketPages] = useState(1);
  const [ticketFilter, setTicketFilter] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (user && !user.is_admin) {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.is_admin) fetchStats();
  }, [user]);

  useEffect(() => {
    if (tab === "users" && user?.is_admin) fetchUsers();
  }, [tab, userPage, userSearch]);

  useEffect(() => {
    if (tab === "tickets" && user?.is_admin) fetchTickets();
  }, [tab, ticketPage, ticketFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch {
      toast.error("Failed to load admin stats");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users", { params: { page: userPage, search: userSearch } });
      setUsers(res.data.users);
      setUserPages(res.data.pages);
      setUserTotal(res.data.total);
    } catch {}
  };

  const fetchTickets = async () => {
    try {
      const res = await api.get("/admin/tickets", { params: { page: ticketPage, status: ticketFilter } });
      setTickets(res.data.tickets);
      setTicketPages(res.data.pages);
    } catch {}
  };

  const toggleAdmin = async (userId: number) => {
    try {
      await api.post(`/admin/users/${userId}/toggle-admin`);
      fetchUsers();
      toast.success("Admin status updated");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const updateTicket = async (ticketId: number, data: Record<string, string>) => {
    try {
      await api.put(`/admin/tickets/${ticketId}`, data);
      fetchTickets();
      toast.success("Ticket updated");
      setReplyingTo(null);
      setReplyText("");
    } catch {
      toast.error("Failed to update ticket");
    }
  };

  if (!user?.is_admin) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "tickets", label: "Tickets" },
  ];

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Navbar />
          <main className="pt-16 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Overview ─────────────────────────────────── */}
            {tab === "overview" && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Users" value={stats.users.total} icon={Users} sub={`+${stats.users.new_7d} this week`} />
                  <StatCard label="Active (7d)" value={stats.users.active_7d} icon={Users} sub={`${stats.users.active_30d} in 30d`} />
                  <StatCard label="Documents" value={stats.documents.total} icon={FileText} sub={formatBytes(stats.documents.total_storage_bytes)} />
                  <StatCard label="Open Tickets" value={stats.tickets.open} icon={Ticket} sub={`${stats.tickets.total} total`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Signups chart (simple bar) */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Signups (Last 30 Days)</h3>
                    {stats.signups_by_day.length === 0 ? (
                      <p className="text-sm text-gray-400">No signups in this period</p>
                    ) : (
                      <div className="flex items-end gap-1 h-32">
                        {stats.signups_by_day.map((d) => {
                          const max = Math.max(...stats.signups_by_day.map((s) => s.count), 1);
                          const h = (d.count / max) * 100;
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center" title={`${d.day}: ${d.count}`}>
                              <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Docs by category */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Documents by Category</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.documents.by_category).map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{cat}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(count / stats.documents.total) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard label="Collections" value={stats.collections.total} icon={FolderOpen} />
                  <StatCard label="Total Storage" value={formatBytes(stats.documents.total_storage_bytes)} icon={HardDrive} />
                </div>
              </div>
            )}

            {/* ─── Users ────────────────────────────────────── */}
            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                      placeholder="Search users..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-sm text-gray-500">{userTotal} users</span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Docs</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Role</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{u.document_count}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_admin ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                              {u.is_admin ? "Admin" : "User"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleAdmin(u.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                              title={u.is_admin ? "Remove admin" : "Make admin"}
                            >
                              {u.is_admin ? <ShieldOff size={16} /> : <Shield size={16} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {userPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setUserPage(Math.max(1, userPage - 1))} disabled={userPage === 1} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-600">Page {userPage} of {userPages}</span>
                    <button onClick={() => setUserPage(Math.min(userPages, userPage + 1))} disabled={userPage === userPages} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── Tickets ──────────────────────────────────── */}
            {tab === "tickets" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {["", "open", "in_progress", "resolved", "closed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setTicketFilter(s); setTicketPage(1); }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        ticketFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {s === "" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {tickets.map((t) => (
                    <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{t.subject}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || ""}`}>
                              {t.status.replace("_", " ")}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[t.priority] || ""}`}>
                              {t.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{t.user_name} ({t.user_email}) &middot; {new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1">
                          <select
                            value={t.status}
                            onChange={(e) => updateTicket(t.id, { status: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-3">{t.description}</p>

                      {t.admin_reply && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs font-medium text-blue-700 mb-1">Admin Reply</p>
                          <p className="text-sm text-blue-900">{t.admin_reply}</p>
                        </div>
                      )}

                      {replyingTo === t.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => updateTicket(t.id, { admin_reply: replyText, status: "resolved" })} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                              Reply & Resolve
                            </button>
                            <button onClick={() => updateTicket(t.id, { admin_reply: replyText })} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                              Reply Only
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyingTo(t.id); setReplyText(t.admin_reply || ""); }}
                          className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <MessageSquare size={14} /> {t.admin_reply ? "Edit Reply" : "Reply"}
                        </button>
                      )}
                    </div>
                  ))}

                  {tickets.length === 0 && (
                    <div className="text-center py-12 text-gray-400">No tickets found</div>
                  )}
                </div>

                {ticketPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setTicketPage(Math.max(1, ticketPage - 1))} disabled={ticketPage === 1} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-600">Page {ticketPage} of {ticketPages}</span>
                    <button onClick={() => setTicketPage(Math.min(ticketPages, ticketPage + 1))} disabled={ticketPage === ticketPages} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
