import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  let backendStatus = "unknown";

  try {
    const res = await fetch(`${backendUrl}/health`, {
      next: { revalidate: 0 },
    });
    backendStatus = res.ok ? "ok" : "error";
  } catch {
    backendStatus = "unreachable";
  }

  return NextResponse.json({
    status: "ok",
    backend: backendStatus,
    timestamp: new Date().toISOString(),
  });
}
