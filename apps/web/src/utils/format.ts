const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

const dateTimeFormat = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const relativeFormat = new Intl.RelativeTimeFormat("es", {
  numeric: "auto",
  style: "short",
});

export const formatDate = (date: Date) => dateFormat.format(date);

export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "ahora mismo", "hace 5 min", "ayer"; past a week the plain date reads better. */
export const formatRelative = (date: Date, now = Date.now()) => {
  const elapsed = date.getTime() - now;
  const magnitude = Math.abs(elapsed);

  if (magnitude < MINUTE) {
    return "ahora mismo";
  }

  if (magnitude < HOUR) {
    return relativeFormat.format(Math.round(elapsed / MINUTE), "minute");
  }

  if (magnitude < DAY) {
    return relativeFormat.format(Math.round(elapsed / HOUR), "hour");
  }

  if (magnitude < WEEK) {
    return relativeFormat.format(Math.round(elapsed / DAY), "day");
  }

  return formatDate(date);
};
