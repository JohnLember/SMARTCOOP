// Shared formatting helpers.

// Formats a date value as "January 1, 2026". Returns "—" for empty/invalid.
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Formats a date-time as "January 1, 2026, 3:45 PM".
export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}
