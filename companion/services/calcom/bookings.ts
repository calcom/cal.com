/**
 * Booking-related functions for Cal.com API
 */

import { safeLogError, safeLogInfo } from "@/utils/safeLogger";

import type {
  AddGuestInput,
  AddGuestsResponse,
  Booking,
  BookingParticipationResult,
  BookingRecording,
  BookingTranscript,
  ConferencingSession,
  GetConferencingSessionsResponse,
  GetRecordingsResponse,
  GetTranscriptsResponse,
  MarkAbsentRequest,
  MarkAbsentResponse,
  UpdateLocationResponse,
  UserProfile,
} from "../types";

import { makeRequest } from "./request";
import { getUserProfile } from "./user";

/**
 * Determine user's participation role in a booking
 */
export const getBookingParticipation = (
  booking: Booking,
  userId?: number,
  userEmail?: string
): BookingParticipationResult => {
  const normalizedUserEmail = userEmail?.toLowerCase();
  const emailEq = (a?: string, b?: string) => a?.toLowerCase() === b?.toLowerCase();
  const idEq = (a?: string | number, b?: string | number) =>
    a !== undefined && b !== undefined && String(a) === String(b);

  const isOrganizer =
    !!booking.user &&
    (idEq(booking.user.id, userId) || emailEq(booking.user.email, normalizedUserEmail));

  const isHost =
    Array.isArray(booking.hosts) &&
    booking.hosts.some((host) => idEq(host.id, userId) || emailEq(host.email, normalizedUserEmail));

  const isAttendee =
    Array.isArray(booking.attendees) &&
    booking.attendees.some(
      (attendee) => idEq(attendee.id, userId) || emailEq(attendee.email, normalizedUserEmail)
    );

  const isParticipating = isOrganizer || isHost || isAttendee;

  return { isOrganizer, isHost, isAttendee, isParticipating };
};

/**
 * Get a single booking by UID
 */
export async function getBookingByUid(bookingUid: string): Promise<Booking> {
  try {
    const response = await makeRequest<{ status: string; data: Booking }>(
      `/bookings/${bookingUid}`,
      {
        headers: {
          "cal-api-version": "2024-08-13",
        },
      },
      "2024-08-13"
    );
    if (response?.data) {
      return response.data;
    }
    throw new Error("Invalid response from get booking API");
  } catch (error) {
    console.error("getBookingByUid error:", error);
    throw error;
  }
}

/**
 * Get bookings with optional filters
 */
export async function getBookings(filters?: {
  status?: string[];
  fromDate?: string;
  toDate?: string;
  eventTypeId?: number;
  limit?: number;
  offset?: number;
}): Promise<Booking[]> {
  // Build query parameters
  const params = new URLSearchParams();

  if (filters?.status?.length) {
    for (const status of filters.status) {
      params.append("status", status);
    }
  }
  if (filters?.fromDate) {
    params.append("fromDate", filters.fromDate);
  }
  if (filters?.toDate) {
    params.append("toDate", filters.toDate);
  }
  if (filters?.eventTypeId) {
    params.append("eventTypeId", filters.eventTypeId.toString());
  }
  if (filters?.limit) {
    params.append("limit", filters.limit.toString());
  }
  if (filters?.offset) {
    params.append("offset", filters.offset.toString());
  }

  const queryString = params.toString();
  const endpoint = `/bookings${queryString ? `?${queryString}` : ""}`;

  const response = await makeRequest<unknown>(endpoint);

  // Handle different possible response structures (same logic as event types)
  let bookingsArray: Booking[] = [];

  if (Array.isArray(response)) {
    bookingsArray = response as Booking[];
  } else if (response && typeof response === "object") {
    const resp = response as Record<string, unknown>;
    if (resp.data && Array.isArray(resp.data)) {
      bookingsArray = resp.data as Booking[];
    } else if (resp.bookings && Array.isArray(resp.bookings)) {
      bookingsArray = resp.bookings as Booking[];
    } else if (resp.items && Array.isArray(resp.items)) {
      bookingsArray = resp.items as Booking[];
    } else if (resp.data && typeof resp.data === "object") {
      const dataObj = resp.data as Record<string, unknown>;
      if (dataObj.bookings && Array.isArray(dataObj.bookings)) {
        bookingsArray = dataObj.bookings as Booking[];
      } else if (dataObj.items && Array.isArray(dataObj.items)) {
        bookingsArray = dataObj.items as Booking[];
      } else {
        // Convert object values to array as last resort
        const keys = Object.keys(dataObj);
        if (keys.length > 0) {
          bookingsArray = Object.values(dataObj).filter((item): item is Booking =>
            Boolean(item && typeof item === "object" && ("id" in item || "uid" in item))
          );
        }
      }
    } else {
      // Try to extract any arrays from the response
      const possibleArrays = Object.values(resp).filter((val) => Array.isArray(val));
      if (possibleArrays.length > 0) {
        bookingsArray = possibleArrays[0] as Booking[];
      }
    }
  }

  // Get cached user profile to filter bookings (uses in-flight deduplication)
  let userProfile: UserProfile | undefined;
  try {
    userProfile = await getUserProfile();
  } catch (_error) {
    return bookingsArray;
  }

  // Extract user info from response
  let userId: number | undefined;
  let userEmail: string | undefined;

  if (userProfile) {
    userId = userProfile.id;
    userEmail = userProfile.email;
  }

  // Filter bookings to only show ones where the current user is participating
  const userBookings = bookingsArray.filter((booking) => {
    const {
      isOrganizer: _isOrganizer,
      isHost: _isHost,
      isAttendee: _isAttendee,
      isParticipating,
    } = getBookingParticipation(booking, userId, userEmail);

    return isParticipating;
  });

  return userBookings;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingUid: string,
  cancellationReason?: string
): Promise<void> {
  const body: { cancellationReason?: string } = {};
  if (cancellationReason) {
    body.cancellationReason = cancellationReason;
  }

  await makeRequest(
    `/bookings/${bookingUid}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
      body: JSON.stringify(body),
    },
    "2024-08-13"
  );
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(
  bookingUid: string,
  input: {
    start: string;
    reschedulingReason?: string;
  }
): Promise<Booking> {
  try {
    safeLogInfo("[CalComAPIService] rescheduleBooking request:", {
      bookingUid,
      input,
    });

    const response = await makeRequest<{ status: string; data: Booking }>(
      `/bookings/${bookingUid}/reschedule`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
        body: JSON.stringify(input),
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from reschedule booking API");
  } catch (error) {
    safeLogError("[CalComAPIService] rescheduleBooking error:", error);
    if (error instanceof Error) {
      safeLogError("[CalComAPIService] Error message:", error.message);
      safeLogError("[CalComAPIService] Error stack:", error.stack);
    }
    throw error;
  }
}

/**
 * Confirm a pending booking
 */
export async function confirmBooking(bookingUid: string): Promise<Booking> {
  try {
    const response = await makeRequest<{ status: string; data: Booking }>(
      `/bookings/${bookingUid}/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from confirm booking API");
  } catch (error) {
    safeLogError("confirmBooking error", { error, bookingUid });
    throw error;
  }
}

/**
 * Decline a pending booking
 */
export async function declineBooking(bookingUid: string, reason?: string): Promise<Booking> {
  try {
    const body: { reason?: string } = {};
    if (reason) {
      body.reason = reason;
    }

    const response = await makeRequest<{ status: string; data: Booking }>(
      `/bookings/${bookingUid}/decline`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
        body: JSON.stringify(body),
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from decline booking API");
  } catch (error) {
    console.error("declineBooking error");
    throw error;
  }
}

/**
 * Mark an attendee as absent (no-show) for a booking
 * @param bookingUid - The unique identifier of the booking
 * @param attendeeEmail - The email of the attendee to mark as absent
 * @param absent - Whether to mark as absent (true) or undo (false)
 */
export async function markAbsent(
  bookingUid: string,
  attendeeEmail: string,
  absent: boolean = true
): Promise<Booking> {
  try {
    const body: MarkAbsentRequest = {
      attendees: [{ email: attendeeEmail, absent }],
    };

    const response = await makeRequest<MarkAbsentResponse>(
      `/bookings/${bookingUid}/mark-absent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
        body: JSON.stringify(body),
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from mark absent API");
  } catch (error) {
    console.error("markAbsent error");
    throw error;
  }
}

/**
 * Add guests to a booking
 * @param bookingUid - The unique identifier of the booking
 * @param guests - Array of guests to add (email required, name optional)
 * @returns Updated booking with new guests
 */
export async function addGuests(bookingUid: string, guests: AddGuestInput[]): Promise<Booking> {
  try {
    const response = await makeRequest<AddGuestsResponse>(
      `/bookings/${bookingUid}/guests`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
        body: JSON.stringify({ guests }),
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from add guests API");
  } catch (error) {
    console.error("addGuests error");
    throw error;
  }
}

/**
 * Update the location of a booking (legacy - sends location as string)
 * Note: This updates the booking location but may not update the calendar event
 * @param bookingUid - The unique identifier of the booking
 * @param location - The new location string
 * @returns Updated booking with new location
 * @deprecated Use updateLocationV2 instead for proper typed location updates
 */
export async function updateLocation(bookingUid: string, location: string): Promise<Booking> {
  try {
    const response = await makeRequest<UpdateLocationResponse>(
      `/bookings/${bookingUid}/location`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
        body: JSON.stringify({ location }),
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update location API");
  } catch (error) {
    console.error("updateLocation error");
    throw error;
  }
}

/**
 * Update the location of a booking with typed location object
 * Supports: address, link, phone, attendeePhone, attendeeAddress, attendeeDefined
 * Note: Integration-based locations (Cal Video, Google Meet, Zoom) are NOT supported
 * @param bookingUid - The unique identifier of the booking
 * @param location - The location object with type and value
 * @returns Updated booking with new location
 */
export async function updateLocationV2(
  bookingUid: string,
  location: { type: string; [key: string]: string }
): Promise<Booking> {
  try {
    const response = await makeRequest<UpdateLocationResponse>(
      `/bookings/${bookingUid}/location`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
        body: JSON.stringify({ location }),
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update location API");
  } catch (error) {
    safeLogError("[CalComAPIService] updateLocationV2 error:", error);
    throw error;
  }
}

/**
 * Get recordings for a booking (Cal Video only)
 * Note: Only available for past Cal Video bookings
 * @param bookingUid - The unique identifier of the booking
 * @returns Array of recording objects with download URLs
 */
export async function getRecordings(bookingUid: string): Promise<BookingRecording[]> {
  try {
    const response = await makeRequest<GetRecordingsResponse>(
      `/bookings/${bookingUid}/recordings`,
      {
        headers: {
          "cal-api-version": "2024-08-13",
        },
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    // Handle 401/403 gracefully - endpoint may require auth in future
    if (error instanceof Error) {
      const statusMatch = error.message.match(/API Error: (\d+)/);
      if (statusMatch && (statusMatch[1] === "401" || statusMatch[1] === "403")) {
        console.warn(`Recordings access denied for booking ${bookingUid}`);
        return [];
      }
      if (statusMatch && statusMatch[1] === "404") {
        console.warn(`No recordings found for booking ${bookingUid}`);
        return [];
      }
    }
    console.error("getRecordings error");
    throw error;
  }
}

/**
 * Get conferencing session details for a booking (Cal Video only)
 * Note: This endpoint is PBAC-guarded and requires booking.readRecordings permission
 * @param bookingUid - The unique identifier of the booking
 * @returns Array of conferencing session objects with participant info
 */
export async function getConferencingSessions(bookingUid: string): Promise<ConferencingSession[]> {
  try {
    const response = await makeRequest<GetConferencingSessionsResponse>(
      `/bookings/${bookingUid}/conferencing-sessions`,
      {
        headers: {
          "cal-api-version": "2024-08-13",
        },
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    // Handle 401/403 gracefully - endpoint is PBAC-guarded
    if (error instanceof Error) {
      const statusMatch = error.message.match(/API Error: (\d+)/);
      if (statusMatch && (statusMatch[1] === "401" || statusMatch[1] === "403")) {
        console.warn(`Conferencing sessions access denied for booking ${bookingUid}`);
        return [];
      }
      if (statusMatch && statusMatch[1] === "404") {
        console.warn(`No conferencing sessions found for booking ${bookingUid}`);
        return [];
      }
    }
    console.error("getConferencingSessions error");
    throw error;
  }
}

/**
 * Get transcripts for a booking (Cal Video only)
 * Note: This endpoint may require authentication in future releases
 * @param bookingUid - The unique identifier of the booking
 * @returns Array of transcript objects with download URLs
 */
export async function getTranscripts(bookingUid: string): Promise<BookingTranscript[]> {
  try {
    const response = await makeRequest<GetTranscriptsResponse>(
      `/bookings/${bookingUid}/transcripts`,
      {
        headers: {
          "cal-api-version": "2024-08-13",
        },
      },
      "2024-08-13"
    );

    if (response?.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    // Handle 401/403 gracefully - endpoint may require auth in future
    if (error instanceof Error) {
      const statusMatch = error.message.match(/API Error: (\d+)/);
      if (statusMatch && (statusMatch[1] === "401" || statusMatch[1] === "403")) {
        console.warn(`Transcripts access denied for booking ${bookingUid}`);
        return [];
      }
      if (statusMatch && statusMatch[1] === "404") {
        console.warn(`No transcripts found for booking ${bookingUid}`);
        return [];
      }
    }
    console.error("getTranscripts error");
    throw error;
  }
}
