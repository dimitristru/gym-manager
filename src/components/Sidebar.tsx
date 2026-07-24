"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { version } from "../../package.json";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Μέλη",
    href: "/dashboard/members",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Συνδρομές",
    href: "/dashboard/subscriptions",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: "Πρόγραμμα",
    href: "/dashboard/schedule",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Check-in",
    href: "/dashboard/checkin",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Στατιστικά",
    href: "/dashboard/stats",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Αιτήματα",
    href: "/dashboard/requests",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

interface SidebarProps {
  user: { name?: string | null; email?: string | null };
  pendingCount?: number;
}

export default function Sidebar({ user, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col flex-shrink-0" style={{ backgroundColor: "#111111", borderRight: "1px solid #222222" }}>
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="flex items-center gap-3">
          {/* Ground Zero infinity icon */}
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 100 60" className="w-10 h-7" fill="none">
              <path
                d="M35 30 C35 18 20 10 10 18 C0 26 0 34 10 42 C20 50 35 42 35 30 C35 18 50 10 65 18 C75 26 75 34 65 42 C55 50 35 42 35 30 Z M25 30 C25 24 18 20 13 24 C8 28 8 32 13 36 C18 40 25 36 25 30 Z M45 30 C45 24 52 20 57 24 C62 28 62 32 57 36 C52 40 45 36 45 30 Z"
                fill="#f97316"
              />
            </svg>
          </div>
          <div>
            <p className="font-black text-white text-sm tracking-tight leading-none">GROUND ZERO</p>
            <p className="text-[10px] tracking-[0.25em] font-semibold" style={{ color: "#f97316" }}>FITNESS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const isRequests = item.href === "/dashboard/requests";
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                isActive
                  ? { backgroundColor: "#f97316", color: "#ffffff" }
                  : { color: "#a1a1aa" }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e";
                  (e.currentTarget as HTMLElement).style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#a1a1aa";
                }
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isRequests && pendingCount > 0 && (
                <span
                  className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isActive ? "#ffffff" : "#ef4444", color: isActive ? "#f97316" : "#ffffff" }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid #1e1e1e" }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: "#f97316", color: "#ffffff" }}
          >
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: "#71717a" }}>{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors"
          style={{ color: "#71717a" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#2a0a0a";
            (e.currentTarget as HTMLElement).style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#71717a";
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Αποσύνδεση
        </button>
        <p className="text-center text-[10px] mt-2" style={{ color: "#3f3f46" }}>v{version}</p>
      </div>
    </aside>
  );
}
