export interface CalendarCacheStoreEntry {
  userId: number;
  credentialId: number;
  timeMin: string;
  timeMax: string;
  items: { id: string }[];
  busyTimes: { start: Date | string; end: Date | string; source?: string | null; timeZone?: string }[];
}

interface CalendarCacheStore {
  entries: CalendarCacheStoreEntry[];
  set(entry: CalendarCacheStoreEntry): void;
  get(
    credentialId: number,
    userId: number | null,
    timeMin: string,
    timeMax: string,
    items: { id: string }[]
  ): CalendarCacheStoreEntry | undefined;
  clear(): void;
}

class CalendarCacheStoreImpl implements CalendarCacheStore {
  entries: CalendarCacheStoreEntry[] = [];

  set(entry: CalendarCacheStoreEntry): void {
    this.entries = this.entries.filter(
      (e) => !(e.credentialId === entry.credentialId && e.userId === entry.userId)
    );
    this.entries.push(entry);
  }

  get(
    credentialId: number,
    userId: number | null,
    timeMin: string,
    timeMax: string,
    items: { id: string }[]
  ): CalendarCacheStoreEntry | undefined {
    return this.entries.find(
      (entry) =>
        entry.credentialId === credentialId &&
        entry.userId === userId &&
        entry.timeMin === timeMin &&
        entry.timeMax === timeMax &&
        JSON.stringify(entry.items) === JSON.stringify(items)
    );
  }

  clear(): void {
    this.entries = [];
  }
}

export const calendarCacheStore = new CalendarCacheStoreImpl();
