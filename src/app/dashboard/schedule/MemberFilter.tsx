"use client";

import { useState, useRef, useEffect } from "react";

interface MemberInfo {
  id: string;
  name: string;
}

export default function MemberFilter({
  members,
  selectedId,
  onChange,
}: {
  members: MemberInfo[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const selected = members.find((m) => m.id === selectedId);
  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
          selectedId
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a00-7-7z" />
        </svg>
        <span>{selected ? selected.name : "Φίλτρο αθλητή"}</span>
        {selectedId && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            className="ml-1 w-4 h-4 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        {!selectedId && (
          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg w-56 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Αναζήτηση..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            <button
              onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${!selectedId ? "text-blue-600 font-medium" : "text-slate-600"}`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              Όλοι οι αθλητές
            </button>

            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false); setSearch(""); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${selectedId === m.id ? "text-blue-600 font-semibold bg-blue-50" : "text-slate-700"}`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {m.name[0].toUpperCase()}
                </div>
                {m.name}
                {selectedId === m.id && (
                  <svg className="w-3.5 h-3.5 text-blue-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">Δεν βρέθηκε αθλητής</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
