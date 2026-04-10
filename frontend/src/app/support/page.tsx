"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { Plus, Ticket, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface TicketItem {
  id: number;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

const statusIcons: Record<string, any> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: CheckCircle2,
};

const statusColors: Record<string, string> = {
  open: "text-blue-600 bg-blue-50",
  in_progress: "text-yellow-600 bg-yellow-50",
  resolved: "text-green-600 bg-green-50",
  closed: "text-gray-500 bg-gray-50",
};

const priorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get("/tickets");
      setTickets(res.data.tickets);
    } catch {}
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setLoading(true);
    try {
      await api.post("/tickets", { subject, description, category, priority });
      toast.success("Ticket submitted");
      setSubject("");
      setDescription("");
      setCategory("general");
      setPriority("medium");
      setShowForm(false);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Navbar />
          <main className="pt-16 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Support</h1>
                <p className="text-sm text-gray-500 mt-1">Raise tickets and track support requests</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> New Ticket
              </button>
            </div>

            {/* ─── Create Ticket Form ──────────────────────── */}
            {showForm && (
              <form onSubmit={createTicket} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Brief summary of your issue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="account">Account Issue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    placeholder="Describe your issue in detail..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Submitting..." : "Submit Ticket"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ─── Ticket List ─────────────────────────────── */}
            <div className="space-y-3">
              {tickets.map((t) => {
                const StatusIcon = statusIcons[t.status] || AlertCircle;
                return (
                  <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${statusColors[t.status] || ""}`}>
                        <StatusIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900">{t.subject}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge[t.priority] || ""}`}>
                            {t.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{t.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Created {new Date(t.created_at).toLocaleDateString()}
                          {t.resolved_at && <> &middot; Resolved {new Date(t.resolved_at).toLocaleDateString()}</>}
                        </p>

                        {t.admin_reply && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-medium text-blue-700 mb-1">Admin Reply</p>
                            <p className="text-sm text-blue-900">{t.admin_reply}</p>
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[t.status] || ""}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}

              {tickets.length === 0 && !showForm && (
                <div className="text-center py-16">
                  <Ticket size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No support tickets yet</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Create your first ticket
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
