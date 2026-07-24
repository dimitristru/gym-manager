export interface WeeklySlot {
  day: number;  // 1=Mon ... 7=Sun
  time: string; // "HH:MM"
}

export function parseWeeklySlots(weeklyDays: string | null): WeeklySlot[] {
  if (!weeklyDays) return [];
  try {
    const parsed = JSON.parse(weeklyDays);
    if (Array.isArray(parsed)) return parsed as WeeklySlot[];
  } catch {
    // legacy: comma-separated day numbers
    return weeklyDays.split(",").map(Number).filter((n) => n >= 1 && n <= 7).map((day) => ({ day, time: "09:00" }));
  }
  return [];
}

export function parseWeeklyDays(weeklyDays: string | null): number[] {
  return parseWeeklySlots(weeklyDays).map((s) => s.day);
}

export function countClassesInMonth(year: number, month: number, days: number[]): number {
  if (days.length === 0) return 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const jsDay = new Date(year, month - 1, d).getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (days.includes(isoDay)) count++;
  }
  return count;
}

export const DAY_NAMES: Record<number, string> = {
  1: "Δευτέρα",
  2: "Τρίτη",
  3: "Τετάρτη",
  4: "Πέμπτη",
  5: "Παρασκευή",
  6: "Σάββατο",
  7: "Κυριακή",
};
