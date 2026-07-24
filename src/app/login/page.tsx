"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) setError("Λάθος email ή κωδικός");
    else router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-sm px-4">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div
              className="w-20 h-20 flex items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <svg viewBox="0 0 100 60" className="w-14 h-10" fill="none">
                <path
                  d="M35 30 C35 18 20 10 10 18 C0 26 0 34 10 42 C20 50 35 42 35 30 C35 18 50 10 65 18 C75 26 75 34 65 42 C55 50 35 42 35 30 Z M25 30 C25 24 18 20 13 24 C8 28 8 32 13 36 C18 40 25 36 25 30 Z M45 30 C45 24 52 20 57 24 C62 28 62 32 57 36 C52 40 45 36 45 30 Z"
                  fill="#f97316"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">GROUND ZERO</h1>
          <p className="text-sm tracking-[0.3em] font-semibold mt-0.5" style={{ color: "#f97316" }}>FITNESS</p>
          <p className="text-sm mt-3" style={{ color: "#71717a" }}>Σύνδεση στο σύστημα διαχείρισης</p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@gym.local"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                style={{ backgroundColor: "#1e1e1e", border: "1px solid #333", color: "white" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Κωδικός</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                style={{ backgroundColor: "#1e1e1e", border: "1px solid #333" }}
              />
            </div>

            {error && (
              <p
                className="text-sm rounded-xl px-3.5 py-2.5"
                style={{ color: "#fca5a5", backgroundColor: "#2a0a0a", border: "1px solid #7f1d1d" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white text-sm font-black rounded-xl transition-all disabled:opacity-50 tracking-widest hover:opacity-90"
              style={{ backgroundColor: "#f97316" }}
            >
              {loading ? "ΣΥΝΔΕΣΗ..." : "ΣΥΝΔΕΣΗ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
