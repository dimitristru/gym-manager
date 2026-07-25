"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

interface DashboardShellProps {
  user: { name?: string | null; email?: string | null };
  pendingCount: number;
  children: React.ReactNode;
}

export default function DashboardShell({ user, pendingCount, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open, always visible on lg+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:translate-x-0 lg:flex ${
          sidebarOpen ? "translate-x-0 flex" : "-translate-x-full"
        }`}
      >
        <Sidebar user={user} pendingCount={pendingCount} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ backgroundColor: "#0f0f0f" }}>
        {/* Mobile top bar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: "#111111", borderBottom: "1px solid #1e1e1e" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "#a1a1aa" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 100 60" className="w-8 h-5" fill="none">
              <path d="M35 30 C35 18 20 10 10 18 C0 26 0 34 10 42 C20 50 35 42 35 30 C35 18 50 10 65 18 C75 26 75 34 65 42 C55 50 35 42 35 30 Z M25 30 C25 24 18 20 13 24 C8 28 8 32 13 36 C18 40 25 36 25 30 Z M45 30 C45 24 52 20 57 24 C62 28 62 32 57 36 C52 40 45 36 45 30 Z" fill="#f97316" />
            </svg>
            <span className="font-black text-white text-sm tracking-tight">GROUND ZERO</span>
          </div>
          {pendingCount > 0 && (
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#ef4444", color: "#fff" }}>
              {pendingCount}
            </span>
          )}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
