"use client";

import { useState } from "react";
import { X, Link2, Copy, Check, Loader2, Mail, Clock, Lock } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

const EXPIRY_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

export default function ShareModal({
  docId,
  docTitle,
  onClose,
}: {
  docId: number;
  docTitle: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"link" | "email">("link");
  const [expiryHours, setExpiryHours] = useState(24);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const body: Record<string, unknown> = { doc_id: docId, expiry_hours: expiryHours };
      if (usePassword && password.trim()) {
        body.password = password.trim();
      }
      const res = await api.post("/documents/share", body);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setShareLink(`${origin}/share/${res.data.token}`);
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      // Create a link first if we don't have one
      let token = shareLink;
      if (!token) {
        const res = await api.post("/documents/share", { doc_id: docId, expiry_hours: expiryHours });
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        token = `${origin}/share/${res.data.token}`;
        setShareLink(token);
      }
      await api.post("/documents/share/email", { doc_id: docId, email: email.trim(), share_link: token });
      toast.success(`Shared with ${email}`);
      setEmail("");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Share &quot;{docTitle}&quot;</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1">
          <button
            onClick={() => setTab("link")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              tab === "link" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Link2 size={14} /> Shareable Link
          </button>
          <button
            onClick={() => setTab("email")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              tab === "email" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Mail size={14} /> Email
          </button>
        </div>

        <div className="p-5">
          {/* Expiry selector (shared between tabs) */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              <Clock size={12} className="inline mr-1" /> Link expires in
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  onClick={() => { setExpiryHours(opt.hours); setShareLink(null); }}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    expiryHours === opt.hours
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "link" ? (
            <div>
              {/* Password protection toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => { setUsePassword(e.target.checked); setShareLink(null); }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Lock size={12} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">Require password</span>
                </label>
                {usePassword && (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setShareLink(null); }}
                    placeholder="Enter a password for this link"
                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              {shareLink ? (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateLink}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {creating ? "Creating..." : "Create Shareable Link"}
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && email.trim() && handleSendEmail()}
                />
                <button
                  onClick={handleSendEmail}
                  disabled={!email.trim() || sending}
                  className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                A shareable link will be created and sent to this email.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
