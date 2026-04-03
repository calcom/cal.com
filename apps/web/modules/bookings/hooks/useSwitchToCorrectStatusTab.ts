import { trpc } from "@calcom/trpc/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { validStatuses } from "../lib/validStatuses";
import type { BookingListingStatus, BookingOutput } from "../types";

interface BookingForTabResolution {
  status: string;
  endTime: Date | string;
  recurringEventId: string | null;
}

interface UseSwitchToCorrectTabResult {
  resolvedTabStatus: BookingListingStatus;
  isResolvingTabStatus: boolean;
  preSelectedBooking: BookingOutput | null;
}

export function getTabForBooking(booking: BookingForTabResolution): BookingListingStatus {
  const isPast = new Date(booking.endTime) <= new Date();

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    return "cancelled";
  }
  if (booking.status === "PENDING" && !isPast) {
    return "unconfirmed";
  }
  if (isPast) {
    return "past";
  }
  if (booking.recurringEventId) {
    return "recurring";
  }
  return "upcoming";
}

/**
 * Ensures that the correct status tab is selected based on the pre-selected booking through query params
 */
export function useSwitchToCorrectStatusTab({
  defaultStatus,
}: {
  defaultStatus: BookingListingStatus;
}): UseSwitchToCorrectTabResult {
  const {
    preSelectedBookingUid,
    preSelectedBooking,
    preSelectedBookingFull,
    isPending: isFetchingPreSelectedBooking,
  } = usePreSelectedBooking();
  const pathname = usePathname();
  const router = useRouter();
  const [resolvedTabStatus, setResolvedTab] = useState<BookingListingStatus>(defaultStatus);
  const [isNavigatingToCorrectTab, startNavigationToCorrectTab] = useTransition();

  useEffect(() => {
    if (!preSelectedBooking) return;
    const correctTab = getTabForBooking(preSelectedBooking);
    const currentTab = pathname?.match(/\/bookings\/(\w+)/)?.[1];
    const shouldNavigate = correctTab && currentTab && correctTab !== currentTab;
    if (!shouldNavigate) return;
    startNavigationToCorrectTab(() => {
      const newPath = pathname.replace(`/bookings/${currentTab}`, `/bookings/${correctTab}`);
      router.replace(`${newPath}${window.location.search}`);
    });
    setResolvedTab(correctTab);
  }, [preSelectedBooking, pathname, router]);

  const isResolvingTabStatus = preSelectedBookingUid
    ? isFetchingPreSelectedBooking || isNavigatingToCorrectTab
    : false;

  return { resolvedTabStatus, isResolvingTabStatus, preSelectedBooking: preSelectedBookingFull };
}

export function usePreSelectedBooking(): {
  preSelectedBookingUid: string | undefined;
  preSelectedBooking: BookingForTabResolution | null;
  preSelectedBookingFull: BookingOutput | null;
  isPending: boolean;
}{
  const searchParams = useSearchParams();
  const preSelectedBookingUid = searchParams?.get("uid") ?? undefined;

  const { data: preSelectedBookingData, isPending } = trpc.viewer.bookings.get.useQuery(
    {
      limit: 1,
      offset: 0,
      filters: {
        bookingUid: preSelectedBookingUid,
        statuses: [...validStatuses],
      },
    },
    {
      enabled: !!preSelectedBookingUid,
      staleTime: 5 * 60 * 1000,
    }
  );

  const preSelectedBookingFull = preSelectedBookingData?.bookings?.[0] ?? null;
  const preSelectedBooking: BookingForTabResolution | null = preSelectedBookingFull;
  return { preSelectedBookingUid, preSelectedBooking, preSelectedBookingFull, isPending };
}
