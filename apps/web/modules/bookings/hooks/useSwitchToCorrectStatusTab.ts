import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { BookingListingStatus } from "../types";
import { useBookingTabResolution } from "./useBookingTabResolution";

interface BookingForTabResolution {
  status: string;
  endTime: Date | string;
  recurringEventId: string | null;
}

interface UseSwitchToCorrectTabResult {
  resolvedTabStatus: BookingListingStatus;
  isResolvingTabStatus: boolean;
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
    initialBookingUid,
    booking: initialBooking,
    isPending: isFetchingInitialBooking,
  } = useBookingTabResolution();
  const pathname = usePathname();
  const router = useRouter();
  const [resolvedTabStatus, setResolvedTab] = useState<BookingListingStatus>(defaultStatus);
  const [isNavigatingToCorrectTab, startNavigationToCorrectTab] = useTransition();

  useEffect(() => {
    if (!initialBooking) return;
    const correctTab = getTabForBooking(initialBooking);
    const currentTab = pathname?.match(/\/bookings\/(\w+)/)?.[1];
    const shouldNavigate = correctTab && currentTab && correctTab !== currentTab;
    if (!shouldNavigate) return;
    startNavigationToCorrectTab(() => {
      const newPath = pathname.replace(`/bookings/${currentTab}`, `/bookings/${correctTab}`);
      router.replace(`${newPath}${window.location.search}`);
    });
    setResolvedTab(correctTab);
  }, [initialBooking, pathname, router]);

  const isResolvingTabStatus = initialBookingUid
    ? isFetchingInitialBooking || isNavigatingToCorrectTab
    : false;

  return { resolvedTabStatus, isResolvingTabStatus };
}
