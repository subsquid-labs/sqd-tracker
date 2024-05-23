export function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

export function trimDateDay(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function trimDateMonth(date: Date): string {
  return date.toISOString().split("T")[0].substring(0, 7);
}
