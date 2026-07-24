"use client";

import { useState } from "react";

interface Props {
  memberId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
}

export default function MemberProfileTab({ memberId, userName, userEmail, userPhone }: Props) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState(userPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const hasChanges = name !== userName || email !== userEmail || phone !== (userPhone ?? "");

  async function save() {
    if (!email.trim()) { setError("Το email είναι υποχρεωτικό"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || null }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Σφάλμα αποθήκευσης");
    }
  }

  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
          style={{ backgroundColor: "#f9731620", color: "#f97316" }}>
          {initials}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{name}</p>
          <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Μέλος Ground Zero Fitness</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
        <p className="text-sm font-bold text-white">Στοιχεία επικοινωνίας</p>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Ονοματεπώνυμο</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#f9731660")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#f9731660")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Τηλέφωνο <span style={{ color: "#52525b" }}>(προαιρετικό)</span></label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="69XXXXXXXX"
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f4f4f5" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#f9731660")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          />
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#ef444415", color: "#ef4444" }}>{error}</p>
        )}

        {saved && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#10b98115", color: "#10b981" }}>
            ✓ Τα στοιχεία αποθηκεύτηκαν
          </p>
        )}

        <button
          onClick={save}
          disabled={saving || !hasChanges}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
          style={{ backgroundColor: "#f97316", color: "#fff" }}>
          {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
        </button>
      </div>

      {/* Info note */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#52525b">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs" style={{ color: "#52525b" }}>
          Το nickname εμφανίζεται μόνο στον διαχειριστή και δεν μπορεί να αλλαχθεί από εδώ.
        </p>
      </div>
    </div>
  );
}
