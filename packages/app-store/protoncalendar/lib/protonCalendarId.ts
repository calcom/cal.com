import { createHash } from "node:crypto";

export function getProtonCalendarExternalId(url: string): string {
  return `proton-${createHash("sha256").update(url).digest("hex").slice(0, 32)}`;
}
