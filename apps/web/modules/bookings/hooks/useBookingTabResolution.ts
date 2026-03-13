import { trpc } from "@calcom/trpc/react";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

interface BookingForTabResolution {
  status: string;
  endTime: Date | string;
  recurringEventId: string | null;
}

export function useBookingTabResolution(): {
  initialBookingUid: string | undefined;
  booking: BookingForTabResolution | null;
  isPending: boolean;
} {
  // Read uid directly from searchParams rather than the booking details store
  // because tab resolution must run before store hydration completes — the store
  // syncs with the URL asynchronously, and we need the uid at initial mount to
  // detect deep links and navigate to the correct tab without a flash.
  const searchParams = useSearchParams();
  const uidFromUrl = searchParams?.get("uid") ?? undefined;

  // Only fetch if the uid was present in the URL at initial mount (deep linking).
  // When a user clicks a booking in the list, the store-to-URL sync adds ?uid=xxx,
  // but we don't need to re-fetch since the booking is already in the list data.
  const mountUidRef = useRef(uidFromUrl);
  const isInitialUid = !!uidFromUrl && uidFromUrl === mountUidRef.current;

  const { data: booking, isPending } = trpc.viewer.bookings.getBookingForTabResolution.useQuery(
    { uid: uidFromUrl! },
    {
      enabled: isInitialUid,
      staleTime: 5 * 60 * 1000,
    }
  );

  return {
    initialBookingUid: isInitialUid ? uidFromUrl : undefined,
    booking: isInitialUid ? (booking ?? null) : null,
    isPending: isInitialUid ? isPending : false,
  };
}
