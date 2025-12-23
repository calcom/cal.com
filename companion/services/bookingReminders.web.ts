import type { Booking } from "./calcom";

// Web/extension: notifications are out of scope for this release.

export const getBookingRemindersUserKey = (userInfo: unknown): string | null => {
  if (!userInfo || typeof userInfo !== "object") return null;

  const candidate = userInfo as { id?: unknown; email?: unknown };
  if (typeof candidate.id === "number" && Number.isFinite(candidate.id)) {
    return `id:${candidate.id}`;
  }
  if (typeof candidate.email === "string" && candidate.email.trim().length > 0) {
    return `email:${candidate.email.trim().toLowerCase()}`;
  }
  return null;
};

export async function initializeBookingReminders(): Promise<void> {
  return;
}

export async function syncBookingReminders(_params: {
  userKey: string;
  bookings: Booking[];
}): Promise<void> {
  return;
}

export async function cancelAllBookingReminders(_userKey: string): Promise<void> {
  return;
}

export async function scheduleTestBookingReminder(): Promise<void> {
  return;
}
