export interface CalendarCacheStoreEntry {
  userId: number | null;
  credentialId: number;
  timeMin: string;
  timeMax: string;
  items: { id: string }[];
  busyTimes: { start: Date | string; end: Date | string; source?: string | null; timeZone?: string }[];
}

export interface CalendarCacheKey {
  userId: number | null;
  credentialId: number;
  timeMin: string;
  timeMax: string;
  items: { id: string }[];
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
  hasCacheForKeys(keys: CalendarCacheKey[]): boolean;
  getUsersWithCompleteCacheHits(
    userCalendarCredentials: { userId: number; credentialId: number }[],
    timeMin: string,
    timeMax: string,
    calendarItems: Record<number, { id: string }[]>
  ): number[];
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
    userId: number | null | undefined,
    timeMin: string,
    timeMax: string,
    items: { id: string }[]
  ): CalendarCacheStoreEntry | undefined {
    const normalizedUserId = userId ?? null;
    return this.entries.find(
      (entry) =>
        entry.credentialId === credentialId &&
        entry.userId === normalizedUserId &&
        entry.timeMin === timeMin &&
        entry.timeMax === timeMax &&
        JSON.stringify(entry.items) === JSON.stringify(items)
    );
  }

  /**
   * Check if all the provided cache keys have entries in the store
   */
  hasCacheForKeys(keys: CalendarCacheKey[]): boolean {
    return keys.every((key) =>
      this.entries.some(
        (entry) =>
          entry.credentialId === key.credentialId &&
          entry.userId === key.userId &&
          entry.timeMin === key.timeMin &&
          entry.timeMax === key.timeMax &&
          JSON.stringify(entry.items) === JSON.stringify(key.items)
      )
    );
  }

  /**
   * Get users that have complete cache hits for all their calendar credentials
   * This is used to determine which users can use the CachedCalendarService
   */
  getUsersWithCompleteCacheHits(
    userCalendarCredentials: { userId: number; credentialId: number }[],
    timeMin: string,
    timeMax: string,
    calendarItems: Record<number, { id: string }[]>
  ): number[] {
    const credentialsByUser: Record<number, { credentialId: number; items: { id: string }[] }[]> = {};

    userCalendarCredentials.forEach(({ userId, credentialId }) => {
      if (!credentialsByUser[userId]) {
        credentialsByUser[userId] = [];
      }

      const items = calendarItems[credentialId] || [];
      credentialsByUser[userId].push({ credentialId, items });
    });

    const usersWithCompleteCacheHits: number[] = [];

    Object.entries(credentialsByUser).forEach(([userIdStr, credentials]) => {
      const userId = parseInt(userIdStr, 10);

      const allCredentialsHaveCacheHits = credentials.every(({ credentialId, items }) => {
        return this.get(credentialId, userId, timeMin, timeMax, items) !== undefined;
      });

      if (allCredentialsHaveCacheHits && credentials.length > 0) {
        usersWithCompleteCacheHits.push(userId);
      }
    });

    return usersWithCompleteCacheHits;
  }

  clear(): void {
    this.entries = [];
  }
}

export const calendarCacheStore = new CalendarCacheStoreImpl();
