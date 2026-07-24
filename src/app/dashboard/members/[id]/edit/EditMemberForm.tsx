"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DAY_NAMES, parseWeeklySlots, type WeeklySlot } from "@/lib/personalized";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface MemberData {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  emergencyContact: string;
  notes: string;
  weeklyDays: string;
}

export default function EditMemberForm({ member }: { member: MemberData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<WeeklySlot[]>(
    parseWeeklySlots(member.weeklyDays)
  );

  function toggleDay(day: number) {
    const exists = slots.find((s) => s.day === day);
    if (exists) {
      setSlots((prev) => prev.filter((s) => s.day !== day));
    } else {
      setSlots((prev) => [...prev, { day, time: "09:00" }].sort((a, b) => a.day - b.day));
    }
  }

  function setTime(day: number, time: string) {
    setSlots((prev) => prev.map((s) => s.day === day ? { ...s, time } : s));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      nickname: form.get("nickname") || null,
      phone: form.get("phone") || null,
      dateOfBirth: form.get("dateOfBirth") || null,
      emergencyContact: form.get("emergencyContact") || null,
      notes: form.get("notes") || null,
      weeklyDays: slots.length > 0 ? JSON.stringify(slots) : null,
    };

    const res = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) {
      let msg = "Σφάλμα αποθήκευσης";
      try { const d = await res.json(); msg = d.error ?? msg; } catch {}
      setError(msg);
      return;
    }

    router.refresh();
    router.push(`/dashboard/members/${member.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-6">
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ονοματεπώνυμο *</label>
          <input name="name" required defaultValue={member.name} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nickname <span className="text-slate-400 font-normal">(εμφανίζεται στο calendar αντί του ονόματος)</span>
          </label>
          <input name="nickname" defaultValue={member.nickname} placeholder="π.χ. Αλέξης" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input value={member.email} disabled className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Τηλέφωνο</label>
          <input name="phone" type="tel" defaultValue={member.phone} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ημ. γέννησης</label>
          <input name="dateOfBirth" type="date" defaultValue={member.dateOfBirth} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Επαφή έκτακτης ανάγκης</label>
          <input name="emergencyContact" defaultValue={member.emergencyContact} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Σημειώσεις</label>
          <textarea name="notes" rows={3} defaultValue={member.notes} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="pt-4 border-t border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-1">Σταθερό εβδομαδιαίο πρόγραμμα</label>
        <p className="text-xs text-slate-400 mb-4">Επίλεξε μέρες και ώρες — εμφανίζονται αυτόματα στο ημερολόγιο</p>

        <div className="space-y-2">
          {DAYS.map((day) => {
            const slot = slots.find((s) => s.day === day);
            const active = !!slot;
            return (
              <div key={day} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                >
                  {active ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>

                <span className={`text-sm font-medium w-24 flex-shrink-0 ${active ? "text-blue-900" : "text-slate-500"}`}>
                  {DAY_NAMES[day]}
                </span>

                {active && (
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => setTime(day, e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-blue-300 text-sm text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {!active && (
                  <span className="text-xs text-slate-300">Κλικ για προσθήκη</span>
                )}
              </div>
            );
          })}
        </div>

        {slots.length > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            {slots.length} {slots.length === 1 ? "μέρα" : "μέρες"}/εβδομάδα ·{" "}
            {slots.map((s) => `${DAY_NAMES[s.day]} ${s.time}`).join(", ")}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Ακύρωση
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
          {loading ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
        </button>
      </div>
    </form>
  );
}
