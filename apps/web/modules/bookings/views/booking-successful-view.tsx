"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { localStorage } from "@calcom/lib/webstorage";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

type LocalStorageData = {
  bookingUid: string;
  query: Record<string, string | null | undefined | boolean>;
  timestamp: number;
};

export default function BookingSuccessfulView(props: { localStorageUid: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { localStorageUid } = props;
    const storageKey = `cal.booking-success.${localStorageUid}`;

    try {
      const dataStr = localStorage.getItem(storageKey);

      if (!dataStr) {
        setError("Booking confirmation data not found. This link may have expired.");
        return;
      }

      const data: LocalStorageData = JSON.parse(dataStr);

      localStorage.removeItem(storageKey);

      const dataAge = Date.now() - data.timestamp;
      const maxAge = 24 * 60 * 60 * 1000;

      if (dataAge > maxAge) {
        setError("This booking confirmation link has expired. Please check your email for booking details.");
        return;
      }

      const queryParams = new URLSearchParams();
      Object.entries(data.query).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.set(key, String(value));
        }
      });

      router.replace(`/booking/${data.bookingUid}?${queryParams.toString()}`);
    } catch (err) {
      console.error("Error reading booking data from localStorage:", err);
      setError("Failed to load booking confirmation. Please check your email for booking details.");
    }
  }, [props, router]);

  if (error) {
    return (
      <div className="flex h-screen">
        <div className="m-auto">
          <EmptyScreen
            headline="Unable to load booking"
            description={error}
            buttonText="Go to homepage"
            buttonOnClick={() => router.push("/")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="m-auto">
        <div className="text-center">
          <div className="mb-4">Loading your booking confirmation...</div>
        </div>
      </div>
    </div>
  );
}
