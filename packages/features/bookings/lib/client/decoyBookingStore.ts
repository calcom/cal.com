import { sessionStorage } from "@calcom/lib/webstorage";

const BOOKING_SUCCESS_STORAGE_KEY_PREFIX = "cal.successfulBooking";
const DECOY_BOOKING_EXPIRATION_MS = 5 * 60 * 1000;

interface DecoyBookingData {
  booking: {
    uid: string;
    title: string | null;
    startTime: string;
    endTime: string;
    booker: { name: string; timeZone?: string; email: string } | null;
    host: { name: string; timeZone?: string } | null;
    location: string | null;
  };
  timestamp: number;
}

function getStorageKey(uid: string): string {
  return `${BOOKING_SUCCESS_STORAGE_KEY_PREFIX}.${uid}`;
}

/**
 * Stores decoy booking data in sessionStorage using the booking's uid
 * Data automatically expires when the browser tab/window is closed or after 5 minutes
 * @param booking - The booking data to store (must include uid)
 */
export function storeDecoyBooking(booking: Record<string, unknown> & { uid: string }): void {
  const bookingSuccessData = {
    booking,
    timestamp: Date.now(),
  };
  const storageKey = getStorageKey(booking.uid);
  sessionStorage.setItem(storageKey, JSON.stringify(bookingSuccessData));
}

/**
 * Retrieves decoy booking data from sessionStorage
 * @param uid - The booking uid
 * @returns The stored booking data or null if not found or expired
 */
export function getDecoyBooking(uid: string): DecoyBookingData | null {
  if (!uid) {
    return null;
  }

  const storageKey = getStorageKey(uid);
  const dataStr = sessionStorage.getItem(storageKey);

  if (!dataStr) {
    return null;
  }

  try {
    const data: DecoyBookingData = JSON.parse(dataStr);

    const isExpired = Date.now() - data.timestamp > DECOY_BOOKING_EXPIRATION_MS;
    if (isExpired) {
      sessionStorage.removeItem(storageKey);
      return null;
    }

    return data;
  } catch {
    // If parsing fails, remove the corrupted data
    sessionStorage.removeItem(storageKey);
    return null;
  }
}

/**
 * Removes decoy booking data from sessionStorage
 * @param uid - The booking uid
 */
export function removeDecoyBooking(uid: string): void {
  if (!uid) {
    return;
  }

  const storageKey = getStorageKey(uid);
  sessionStorage.removeItem(storageKey);
}

export type { DecoyBookingData };
