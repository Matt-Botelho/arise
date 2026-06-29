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
