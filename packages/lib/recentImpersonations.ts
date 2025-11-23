import { localStorage } from "@calcom/lib/webstorage";

export interface RecentImpersonation {
  username: string;
  timestamp: number;
}

const STORAGE_KEY = "cal-recent-impersonations";
const MAX_RECENT = 5;

export function getRecentImpersonations(): RecentImpersonation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addRecentImpersonation(usernameRaw: string): void {
  try {
    const recent = getRecentImpersonations();
    const username = usernameRaw.trim().toLowerCase();
    if (!username) return;
    const filtered = recent.filter((item) => item.username !== username);
    const updated = [{ username, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearRecentImpersonations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
