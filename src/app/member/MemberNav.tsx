"use client";

import { signOut } from "next-auth/react";

export default function MemberNav({ userName }: { userName: string }) {
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header style={{ backgroundColor: "#111111", borderBottom: "1px solid #1e1e1e" }}>
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 100 60" className="w-8 h-5" fill="none">
            <path
              d="M35 30 C35 18 20 10 10 18 C0 26 0 34 10 42 C20 50 35 42 35 30 C35 18 50 10 65 18 C75 26 75 34 65 42 C55 50 35 42 35 30 Z M25 30 C25 24 18 20 13 24 C8 28 8 32 13 36 C18 40 25 36 25 30 Z M45 30 C45 24 52 20 57 24 C62 28 62 32 57 36 C52 40 45 36 45 30 Z"
              fill="#f97316"
            />
          </svg>
          <div>
            <p className="font-black text-white text-sm tracking-tight leading-none">GROUND ZERO</p>
            <p className="text-[9px] tracking-[0.2em] font-semibold leading-none mt-0.5" style={{ color: "#f97316" }}>FITNESS</p>
          </div>
        </div>

        {/* User + signout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "#f9731620", color: "#f97316" }}>
              {initials}
            </div>
            <span className="text-sm font-medium text-white hidden sm:block">{userName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: "#1e1e1e", color: "#71717a", border: "1px solid #2a2a2a" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.borderColor = "#ef444440"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#71717a"; (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"; }}>
            Έξοδος
          </button>
        </div>
      </div>
    </header>
  );
}
