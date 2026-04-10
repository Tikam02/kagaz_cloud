"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSent(true);
      // In dev mode, the API returns the token directly
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
      }
      toast.success("Reset instructions sent");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DocMan</h1>
          <p className="text-gray-500 mt-2">Reset your password</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <p className="text-sm text-gray-600">
              Enter your email address and we&apos;ll generate a password reset link.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-sm text-center text-gray-500">
              <Link href="/login" className="text-blue-600 hover:underline">Back to Login</Link>
            </p>
          </form>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                If an account with that email exists, a reset token has been generated.
              </p>
            </div>
            {resetToken && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700 font-medium mb-1">Dev Mode — Reset Token:</p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  Click here to reset password
                </Link>
              </div>
            )}
            <p className="text-sm text-center text-gray-500">
              <Link href="/login" className="text-blue-600 hover:underline">Back to Login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
