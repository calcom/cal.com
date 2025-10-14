import { localStorage } from "@calcom/lib/webstorage";

const BOOKING_SUCCESS_STORAGE_KEY_PREFIX = "cal.successfulBooking";

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
 * Stores decoy booking data in localStorage using the booking's uid
 * @param booking - The booking data to store (must include uid)
 */
export function storeDecoyBooking(booking: Record<string, unknown> & { uid: string }): void {
  const bookingSuccessData = {
    booking,
    timestamp: Date.now(),
  };
  const storageKey = getStorageKey(booking.uid);
  localStorage.setItem(storageKey, JSON.stringify(bookingSuccessData));
}

/**
 * Retrieves decoy booking data from localStorage
 * @param uid - The booking uid
 * @returns The stored booking data or null if not found or expired
 */
export function getDecoyBooking(uid: string): DecoyBookingData | null {
  if (!uid) {
    return null;
  }

  const storageKey = getStorageKey(uid);
  const dataStr = localStorage.getItem(storageKey);

  if (!dataStr) {
    return null;
  }

  try {
    const data: DecoyBookingData = JSON.parse(dataStr);

    // Check if the data is too old (5 min)
    const dataAge = Date.now() - data.timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (dataAge > maxAge) {
      // Remove the data from localStorage if expired
      localStorage.removeItem(storageKey);
      return null;
    }

    return data;
  } catch {
    // If parsing fails, remove the corrupted data
    localStorage.removeItem(storageKey);
    return null;
  }
}

/**
 * Removes decoy booking data from localStorage
 * @param uid - The booking uid
 */
export function removeDecoyBooking(uid: string): void {
  if (!uid) {
    return;
  }

  const storageKey = getStorageKey(uid);
  localStorage.removeItem(storageKey);
}

export type { DecoyBookingData };
