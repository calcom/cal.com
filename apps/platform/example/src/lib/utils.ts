import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const relativeTime = (time: ReturnType<Date["getTime"]>) => {
  const elapsed = Date.now() - time;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: 24 * 60 * 60 * 1000 * 30,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000,
  } as const;
  type Unit = keyof typeof units;

  for (const u in units) {
    if (Math.abs(elapsed) > units[u as Unit] || u === "second") {
      return rtf.format(
        -Math.sign(elapsed) * Math.round(elapsed / units[u as Unit]),
        u as Unit,
      );
    }
  }
};

