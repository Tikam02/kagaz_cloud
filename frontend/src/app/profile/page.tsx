"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import {
  User,
  Mail,
  Phone,
  Lock,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Unlink,
  AlertCircle,
} from "lucide-react";

type AlertType = { type: "success" | "error"; message: string } | null;

function Alert({ alert, onClose }: { alert: AlertType; onClose: () => void }) {
  if (!alert) return null;
  const isSuccess = alert.type === "success";
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm mb-4 ${
        isSuccess
          ? "bg-green-50 text-green-800 border border-green-200"
          : "bg-red-50 text-red-800 border border-red-200"
      }`}
    >
      {isSuccess ? <CheckCircle size={16} /> : <XCircle size={16} />}
      <span className="flex-1">{alert.message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile, changePassword, refreshUser } = useAuth();

  // Profile form
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileAlert, setProfileAlert] = useState<AlertType>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [passwordAlert, setPasswordAlert] = useState<AlertType>(null);
  const [savingPw, setSavingPw]     = useState(false);

  // Telegram
  const [linkToken, setLinkToken]     = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [telegramAlert, setTelegramAlert] = useState<AlertType>(null);
  const [unlinking, setUnlinking]     = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  // -------------------------------------------------------------------------
  // Profile save
  // -------------------------------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileAlert(null);
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      setProfileAlert({ type: "success", message: "Profile updated successfully." });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to update profile.";
      setProfileAlert({ type: "error", message: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  // -------------------------------------------------------------------------
  // Password change
  // -------------------------------------------------------------------------
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPasswordAlert({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPw.length < 6) {
      setPasswordAlert({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setSavingPw(true);
    setPasswordAlert(null);
    try {
      await changePassword(currentPw, newPw);
      setPasswordAlert({ type: "success", message: "Password changed successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to change password.";
      setPasswordAlert({ type: "error", message: msg });
    } finally {
      setSavingPw(false);
    }
  };

  // -------------------------------------------------------------------------
  // Telegram linking
  // -------------------------------------------------------------------------
  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    setTelegramAlert(null);
    try {
      const res = await api.post("/auth/telegram/link-token");
      setLinkToken(res.data.token);
    } catch {
      setTelegramAlert({ type: "error", message: "Failed to generate link token." });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleUnlink = async () => {
    if (!confirm("Unlink your Telegram from DocMan? You will stop receiving alerts.")) return;
    setUnlinking(true);
    setTelegramAlert(null);
    try {
      await api.delete("/auth/telegram/unlink");
      await refreshUser();
      setLinkToken(null);
      setTelegramAlert({ type: "success", message: "Telegram unlinked successfully." });
    } catch {
      setTelegramAlert({ type: "error", message: "Failed to unlink Telegram." });
    } finally {
      setUnlinking(false);
    }
  };

  const botCommand = linkToken ? `/start ${linkToken}` : "";
  const isLinked = !!user?.telegram_chat_id;

  // -------------------------------------------------------------------------
  // Avatar initials
  // -------------------------------------------------------------------------
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6 min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              Profile Details
          ---------------------------------------------------------------- */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <User size={16} className="text-gray-500" /> Profile Details
              </h2>
            </div>
            <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
              <Alert alert={profileAlert} onClose={() => setProfileAlert(null)} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>

          {/* ----------------------------------------------------------------
              Change Password
          ---------------------------------------------------------------- */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Lock size={16} className="text-gray-500" /> Change Password
              </h2>
            </div>
            <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
              <Alert alert={passwordAlert} onClose={() => setPasswordAlert(null)} />

              {(["Current Password", "New Password", "Confirm New Password"] as const).map((label, i) => {
                const vals  = [currentPw,  newPw,  confirmPw];
                const setters = [setCurrentPw, setNewPw, setConfirmPw];
                return (
                  <div key={label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        value={vals[i]}
                        onChange={(e) => setters[i](e.target.value)}
                        required
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={label}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPw}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingPw ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </section>

          {/* ----------------------------------------------------------------
              Telegram Integration
          ---------------------------------------------------------------- */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Send size={16} className="text-gray-500" /> Telegram Alerts
                </h2>
                {isLinked && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 py-5">
              <Alert alert={telegramAlert} onClose={() => setTelegramAlert(null)} />

              {isLinked ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Telegram is connected</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        You&apos;ll receive daily document expiry alerts at 9:00 AM UTC.
                        Use <code className="bg-green-100 px-1 rounded">/alerts</code> in the bot anytime to check reminders.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Unlink size={14} />
                    {unlinking ? "Unlinking…" : "Disconnect Telegram"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your Telegram account to receive daily document expiry alerts and on-demand reminders via our bot.
                  </p>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      You&apos;ll need to have started a chat with the bot first. Search for your bot on Telegram before linking.
                    </span>
                  </div>

                  {!linkToken ? (
                    <button
                      onClick={handleGenerateToken}
                      disabled={generatingToken}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw size={14} className={generatingToken ? "animate-spin" : ""} />
                      {generatingToken ? "Generating…" : "Generate Link Token"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Send this command to the DocMan bot on Telegram:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-900 text-green-400 rounded-lg text-sm font-mono truncate">
                          {botCommand}
                        </code>
                        <button
                          onClick={() => handleCopy(botCommand)}
                          className="flex-shrink-0 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Copy command"
                        >
                          {copied
                            ? <CheckCircle size={15} className="text-green-500" />
                            : <Copy size={15} className="text-gray-500" />
                          }
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleGenerateToken}
                          disabled={generatingToken}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <RefreshCw size={12} className={generatingToken ? "animate-spin" : ""} />
                          Regenerate token
                        </button>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-400">Token expires once used</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        After sending the command, this page will show your Telegram as connected.
                        Refresh to check the status.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ----------------------------------------------------------------
              Account Info
          ---------------------------------------------------------------- */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Account Info</h2>
            </div>
            <dl className="px-6 py-5 space-y-3 text-sm">
              {[
                { label: "User ID",      value: `#${user?.id}` },
                { label: "Member since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                { label: "Telegram",     value: isLinked ? `Connected (chat ${user?.telegram_chat_id})` : "Not connected" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

        </div>
      </main>
    </AuthGuard>
  );
}
