export const CN_TZ = "Asia/Shanghai";

/**
 * Returns date string in "YYYY-MM-DD" format using Beijing Time (Asia/Shanghai).
 */
export function formatDateKeyCN(d?: Date): string {
  const date = d || new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA outputs YYYY-MM-DD
  return formatter.format(date);
}

/**
 * Returns week string in "YYYY-WW" format using Beijing Time (Asia/Shanghai).
 * ISO 8601 week logic: Week 1 is the first week with a Thursday.
 * Week starts on Monday.
 */
export function formatWeekKeyCN(d?: Date): string {
  const date = d || new Date();
  
  // 1. Get Beijing Time components
  // We use formatToParts to be safe across environments
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CN_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short" // Needed? No, we reconstruct date object
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");

  // Create a date object that represents midnight in Beijing, but in local UTC context 
  // for calculation purposes. We treat it as "local" representation of Beijing time.
  const target = new Date(Date.UTC(year, month, day));
  
  // 2. ISO Week Calculation
  // Move to nearest Thursday: current date + 4 - current day number
  // Day num: Sunday=0, Monday=1, ... Saturday=6 (standard JS)
  // ISO: Monday=1 ... Sunday=7
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  
  // Get first day of year
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${target.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
}
