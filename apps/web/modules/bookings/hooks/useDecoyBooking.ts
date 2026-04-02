"use client";

import type { DecoyBookingData } from "@calcom/features/bookings/lib/client/decoyBookingStore";
import { getDecoyBooking } from "@calcom/features/bookings/lib/client/decoyBookingStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Hook to retrieve and manage decoy booking data from localStorage
 * @param uid - The booking uid
 * @returns The booking data or null if not found/expired
 */
export function useDecoyBooking(uid: string) {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<DecoyBookingData | null>(null);

  useEffect(() => {
    const data = getDecoyBooking(uid);

    if (!data) {
      router.push("/404");
      return;
    }

    setBookingData(data);
  }, [uid, router]);

  return bookingData;
}
