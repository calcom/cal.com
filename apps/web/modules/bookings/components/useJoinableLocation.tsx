import type { TFunction } from "i18next";
import { useMemo } from "react";

import { useBookingLocation } from "@calcom/features/bookings/hooks";
import type { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

interface UseJoinableLocationParams {
  location: string | null;
  metadata?: unknown;
  bookingStatus: BookingStatus;
  t: TFunction;
}

/**
 * Custom hook to determine if a booking location is joinable (i.e., has a clickable URL).
 * This hook is used to show/hide the join meeting button and related UI elements.
 *
 * @returns An object containing:
 * - `isJoinable`: Whether the location is joinable (has a valid URL)
 * - `locationToDisplay`: The location URL or text to display
 * - `provider`: Provider information (label, iconUrl, etc.)
 * - `isLocationURL`: Whether the location is a URL
 */
export function useJoinableLocation({ location, metadata, bookingStatus, t }: UseJoinableLocationParams) {
  const bookingMetadata = useMemo(() => {
    const parsedMetadata = bookingMetadataSchema.safeParse(metadata ?? null);
    return parsedMetadata.success ? parsedMetadata.data : null;
  }, [metadata]);

  const { locationToDisplay, provider, isLocationURL } = useBookingLocation({
    location,
    videoCallUrl: bookingMetadata?.videoCallUrl,
    t,
    bookingStatus,
  });

  const isJoinable = isLocationURL && !!locationToDisplay;

  return {
    isJoinable,
    locationToDisplay,
    provider,
    isLocationURL,
  };
}
