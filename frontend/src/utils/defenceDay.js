// The defence day is rendered on all three portals, so its date and time are
// formatted in one place rather than three slightly different ones.

// A date column arrives as "YYYY-MM-DD". Appending the time keeps it parsed as
// local midnight — `new Date("2026-05-04")` would be read as UTC and can show
// the previous day west of Greenwich.
export const formatDefenceDate = (value) => {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatDefenceTime = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return value || "Not set";
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
};

export const describeDefenceWhen = (schedule) =>
  schedule ? `${formatDefenceDate(schedule.scheduledDate)} at ${formatDefenceTime(schedule.startTime)}` : "";

export const formatTimestamp = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
