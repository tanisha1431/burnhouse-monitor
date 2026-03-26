export function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(time: string | null): string {
  if (!time) return "-";
  return time.slice(0, 5);
}

export function formatCompletionTime(seconds: number | null): string {
  if (seconds == null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatPercentage(value: number | null): string {
  if (value == null) return "-";
  return `${Number(value).toFixed(1)}%`;
}

export function formatDateForQuery(date: Date): string {
  return date.toISOString().split("T")[0];
}
