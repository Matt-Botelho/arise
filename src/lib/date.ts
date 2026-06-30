// Calcule le "jour de jeu" (YYYY-MM-DD) selon le fuseau et l'heure de bascule.
export function gameDay(
  date: Date = new Date(),
  timezone: string = "Europe/Paris",
  rolloverHour: number = 0
): string {
  const shifted = new Date(date.getTime() - rolloverHour * 3600_000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(shifted); // en-CA => YYYY-MM-DD
}

// Clé de semaine = date du lundi (YYYY-MM-DD) de la semaine du jour donné.
export function weekKeyOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = lundi
  dt.setUTCDate(dt.getUTCDate() - dow);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return dt.getUTCFullYear() + "-" + mm + "-" + dd;
}
