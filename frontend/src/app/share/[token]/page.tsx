"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Download, Clock, Eye, AlertCircle, Loader2, Link2, Lock, Timer,
} from "lucide-react";
import { format } from "date-fns";

interface LinkInfo {
  title: string;
  file_type: string;
  expires_at: string;
  views: number;
  has_password: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const FILE_ICONS: Record<string, string> = {
  pdf: "📄", png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", webp: "🖼",
  svg: "🖼", txt: "📝", doc: "📝", docx: "📝",
};

const PREVIEWABLE = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "txt"];

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setRemaining(parts.join(" "));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Password gate state
  const [needsPassword, setNeedsPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pwError, setPwError] = useState("");

  const countdown = useCountdown(info?.expires_at ?? null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/documents/share/${token}/info`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Link not found");
        setInfo(data);
        if (data.has_password) {
          setNeedsPassword(true);
        } else {
          setUnlocked(true);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleVerifyPassword = useCallback(async () => {
    if (!password.trim()) return;
    setVerifying(true);
    setPwError("");
    try {
      const res = await fetch(`${API_BASE}/documents/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setUnlocked(true);
        setNeedsPassword(false);
      } else {
        setPwError("Incorrect password");
      }
    } catch {
      setPwError("Verification failed");
    } finally {
      setVerifying(false);
    }
  }, [token, password]);

  const pwParam = password.trim() ? `?password=${encodeURIComponent(password.trim())}` : "";
  const fileUrl = `${API_BASE}/documents/share/${token}/file${pwParam}`;
  const previewUrl = `${API_BASE}/documents/share/${token}/preview${pwParam}`;
  const icon = info ? (FILE_ICONS[info.file_type.toLowerCase()] ?? "📎") : "📎";
  const canPreview = info ? PREVIEWABLE.includes(info.file_type.toLowerCase()) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
            <Link2 size={13} className="text-blue-500" />
            <span className="font-medium">Kagaz</span> — Shared Document
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

              {/* Meta — countdown timer + views */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100">
                <span className="flex items-center gap-1.5">
                  <Timer size={12} className={countdown === "Expired" ? "text-red-500" : "text-orange-500"} />
                  <span className={countdown === "Expired" ? "text-red-500 font-medium" : ""}>
                    {countdown === "Expired" ? "Expired" : `Expires in ${countdown}`}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={12} />
                  {info.views} view{info.views !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Password gate */}
              {needsPassword && !unlocked && (
                <div className="px-6 py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Lock size={20} className="text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      This document is password protected. Enter the password to continue.
                    </p>
                    <div className="w-full">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                        placeholder="Enter password"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {pwError && <p className="text-xs text-red-500 mt-1">{pwError}</p>}
                    </div>
                    <button
                      onClick={handleVerifyPassword}
                      disabled={!password.trim() || verifying}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {verifying ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                      {verifying ? "Verifying…" : "Unlock"}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions — shown after unlock */}
              {unlocked && (
                <div className="px-6 py-6 space-y-3">
                  <a
                    href={fileUrl}
                    download
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    Download File
                  </a>

                  {canPreview && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={16} />
                      View in Browser
                    </a>
                  )}

                  <p className="text-center text-xs text-gray-400 pt-1">
                    Expires {format(new Date(info.expires_at), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-medium text-gray-500">Kagaz</span>
        </p>
      </div>
    </div>
  );
}
