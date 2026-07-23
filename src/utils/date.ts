// Date/time helpers used across the app.
export const IST_TZ = "Asia/Kolkata";

export const daysBetween = (a: Date | number | string, b: Date | number | string = Date.now()): number => {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Math.floor((tb - ta) / 86_400_000);
};

export const formatIST = (d: Date | number | string, opts: Intl.DateTimeFormatOptions = {}): string =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST_TZ, ...opts }).format(new Date(d));

export const startOfDay = (d: Date = new Date()): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const hoursLeftToday = (): number => {
  const now = new Date();
  const end = startOfDay(now);
  end.setDate(end.getDate() + 1);
  return Math.max(0, (end.getTime() - now.getTime()) / 3_600_000);
};