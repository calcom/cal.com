import type { TFunction } from "i18next";
import { useMemo } from "react";

import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import type { BookingStatus } from "@calcom/prisma/enums";

interface UseBookingLocationParams {
  /**
   * The booking location value from the booking object
   */
  location: string | null | undefined;
  /**
   * The video call URL from booking metadata (if available)
   */
  videoCallUrl?: string | null;
  /**
   * Translation function
   */
  t: TFunction;
  /**
   * Booking status (optional)
   */
  bookingStatus?: BookingStatus;
}

interface UseBookingLocationReturn {
  /**
   * The location message to display (URL or text)
   */
  locationToDisplay: string | null;
  /**
   * The provider information (label, iconUrl, etc.)
   */
  provider: ReturnType<typeof guessEventLocationType>;
  /**
   * Whether the location is a URL that can be clicked
   */
  isLocationURL: boolean;
}

/**
 * Custom hook to process booking location information
 *
 * This hook handles the common pattern of:
 * 1. Determining the actual location (video call URL vs. raw location)
 * 2. Getting the display message for the location
 * 3. Determining the provider type
 * 4. Checking if the location is a clickable URL
 */
export function useBookingLocation({
  location,
  videoCallUrl,
  t,
  bookingStatus,
}: UseBookingLocationParams): UseBookingLocationReturn {
  const locationToDisplay = useMemo(() => {
    if (!location) return null;

    const effectiveLocation = videoCallUrl ?? location;
    return getSuccessPageLocationMessage(effectiveLocation, t, bookingStatus);
  }, [location, videoCallUrl, t, bookingStatus]);

  const provider = useMemo(() => {
    if (!location) return null;
    return guessEventLocationType(location);
  }, [location]);

  const isLocationURL = useMemo(() => {
    return typeof locationToDisplay === "string" && locationToDisplay.startsWith("http");
  }, [locationToDisplay]);

  return {
    locationToDisplay,
    provider,
    isLocationURL,
  };
}
