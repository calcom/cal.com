import type {
  AddGuestInput,
  AddGuestsResponse,
  Booking,
  BookingLimitsCount,
  BookingLimitsDuration,
  BookingParticipationResult,
  BookingRecording,
  BookingTranscript,
  ConferencingOption,
  ConferencingSession,
  ConfirmationPolicy,
  CreateEventTypeInput,
  CreatePrivateLinkInput,
  CreateWebhookInput,
  EventType,
  GetConferencingSessionsResponse,
  GetRecordingsResponse,
  GetTranscriptsResponse,
  MarkAbsentRequest,
  MarkAbsentResponse,
  PrivateLink,
  Schedule,
  UpdateLocationResponse,
  UpdatePrivateLinkInput,
  UpdateWebhookInput,
  UserProfile,
  Webhook,
} from "./types";

const API_BASE_URL = "https://api.cal.com/v2";

// Authentication configuration
interface AuthConfig {
  accessToken?: string;
  refreshToken?: string;
}

// Global auth state
const authConfig: AuthConfig = {};

// Token refresh callback - will be set by AuthContext
let tokenRefreshCallback: ((accessToken: string, refreshToken?: string) => Promise<void>) | null =
  null;

// Refresh token function - will be set by AuthContext
let refreshTokenFunction:
  | ((refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>)
  | null = null;

// Re-export types for backward compatibility
export type {
  EventType,
  CreateEventTypeInput,
  Booking,
  BookingParticipationResult,
  Schedule,
  UserProfile,
  ConferencingOption,
  Webhook,
  CreateWebhookInput,
  UpdateWebhookInput,
  PrivateLink,
  CreatePrivateLinkInput,
  UpdatePrivateLinkInput,
  BookingLimitsCount,
  BookingLimitsDuration,
  ConfirmationPolicy,
};

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

// Module-level state (previously private static)
let _userProfile: UserProfile | null = null;

/**
 * Set OAuth access token for authentication
 */
function setAccessToken(accessToken: string, refreshToken?: string): void {
  authConfig.accessToken = accessToken;
  if (refreshToken) {
    authConfig.refreshToken = refreshToken;
  }
}

/**
 * Set refresh token function for automatic token refresh
 */
function setRefreshTokenFunction(
  refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>
): void {
  refreshTokenFunction = refreshFn;
}

/**
 * Clear all authentication
 */
function clearAuth(): void {
  authConfig.accessToken = undefined;
  authConfig.refreshToken = undefined;
  tokenRefreshCallback = null;
  refreshTokenFunction = null;
}

/**
 * Set token refresh callback for OAuth token refresh
 */
function setTokenRefreshCallback(
  callback: (accessToken: string, refreshToken?: string) => Promise<void>
): void {
  tokenRefreshCallback = callback;
}

/**
 * Get current authentication header
 */
function getAuthHeader(): string {
  if (authConfig.accessToken) {
    return `Bearer ${authConfig.accessToken}`;
  } else {
    throw new Error("No authentication configured. Please sign in with OAuth.");
  }
}

// Get current user profile
async function getCurrentUser(): Promise<UserProfile> {
  const response = await makeRequest<{ status: string; data: UserProfile }>(
    "/me",
    {
      headers: {
        "cal-api-version": "2024-06-11",
      },
    },
    "2024-06-11"
  );
  return response.data;
}

// Update current user profile
async function updateUserProfile(updates: {
  email?: string;
  name?: string;
  timeFormat?: number;
  defaultScheduleId?: number;
  weekStart?: string;
  timeZone?: string;
  locale?: string;
  avatarUrl?: string;
  bio?: string;
  metadata?: Record<string, unknown>;
}): Promise<UserProfile> {
  try {
    const response = await makeRequest<{ status: string; data: UserProfile }>(
      "/me",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-11",
        },
        body: JSON.stringify(updates),
      },
      "2024-06-11"
    );

    if (response?.data) {
      // Update cached profile
      _userProfile = response.data;
      return response.data;
    }

    throw new Error("Invalid response from update user profile API");
  } catch (error) {
    console.error("updateUserProfile error");
    throw error;
  }
}

// Get and cache user profile
async function getUserProfile(): Promise<UserProfile> {
  if (_userProfile) {
    return _userProfile;
  }

  _userProfile = await getCurrentUser();
  return _userProfile;
}

// Get cached username or fetch if not available
async function getUsername(): Promise<string> {
  const profile = await getUserProfile();
  return profile.username;
}

// Build shareable link for event type
async function buildEventTypeLink(eventTypeSlug: string): Promise<string> {
  const username = await getUsername();
  return `https://cal.com/${username}/${eventTypeSlug}`;
}

// Clear cached profile (useful for logout)
function clearUserProfile(): void {
  _userProfile = null;
}

// Test function for bookings API specifically
async function testRawBookingsAPI(): Promise<void> {
  try {
    const url = `${API_BASE_URL}/bookings?status=upcoming&status=unconfirmed&limit=50`;

    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
    });

    const responseText = await response.text();

    try {
      const _responseJson = JSON.parse(responseText);
    } catch (_parseError) {}
  } catch (_error) {}
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  apiVersion: string = "2024-08-13",
  isRetry: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      "cal-api-version": apiVersion,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();

    // Parse error for better user messages
    let errorMessage = response.statusText;

    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson?.error?.message || errorJson?.message || response.statusText;
    } catch (_parseError) {
      // If JSON parsing fails, use the raw error body
      errorMessage = errorBody || response.statusText;
    }

    // Handle specific error cases
    if (response.status === 401) {
      if (!isRetry && authConfig.refreshToken && refreshTokenFunction && tokenRefreshCallback) {
        try {
          const newTokens = await refreshTokenFunction(authConfig.refreshToken);

          authConfig.accessToken = newTokens.accessToken;
          if (newTokens.refreshToken) {
            authConfig.refreshToken = newTokens.refreshToken;
          }

          // Notify AuthContext to update stored tokens
          await tokenRefreshCallback(newTokens.accessToken, newTokens.refreshToken);

          // Retry the original request with the new token
          return makeRequest<T>(endpoint, options, apiVersion, true);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          clearAuth();
          throw new Error("Authentication failed. Please sign in again.");
        }
      }

      if (errorMessage.includes("expired")) {
        throw new Error("Your authentication has expired. Please sign in again.");
      }
      throw new Error("Authentication failed. Please check your credentials.");
    }

    // Include status code in error message for graceful error handling downstream
    throw new Error(`API Error: ${response.status} ${errorMessage}`);
  }

  return response.json();
}

async function deleteEventType(eventTypeId: number): Promise<void> {
  try {
    await makeRequest(
      `/event-types/${eventTypeId}`,
      {
        method: "DELETE",
      },
      "2024-06-14"
    );
  } catch (error) {
    console.error("Delete API error");
    throw error;
  }
}

async function createEventType(input: CreateEventTypeInput): Promise<EventType> {
  try {
    const sanitizedInput = sanitizePayload(input as unknown as Record<string, unknown>);

    const response = await makeRequest<{ status: string; data: EventType }>(
      "/event-types",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-14",
        },
        body: JSON.stringify(sanitizedInput),
      },
      "2024-06-14"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create event type API");
  } catch (error) {
    console.error("createEventType error");
    throw error;
  }
}

// Cancel a booking
async function cancelBooking(bookingUid: string, cancellationReason?: string): Promise<void> {
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

async function rescheduleBooking(
  bookingUid: string,
  input: {
    start: string;
    reschedulingReason?: string;
  }
): Promise<Booking> {
  try {
    console.log("[CalComAPIService] rescheduleBooking request:", {
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
    console.error("[CalComAPIService] rescheduleBooking error:", error);
    if (error instanceof Error) {
      console.error("[CalComAPIService] Error message:", error.message);
      console.error("[CalComAPIService] Error stack:", error.stack);
    }
    throw error;
  }
}

async function confirmBooking(bookingUid: string): Promise<Booking> {
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
    console.error("confirmBooking error");
    throw error;
  }
}

async function declineBooking(bookingUid: string, reason?: string): Promise<Booking> {
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
async function markAbsent(
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

// ============================================================================
// Booking Action API Methods (API v2 2024-08-13)
// ============================================================================

/**
 * Add guests to a booking
 * @param bookingUid - The unique identifier of the booking
 * @param guests - Array of guests to add (email required, name optional)
 * @returns Updated booking with new guests
 */
async function addGuests(bookingUid: string, guests: AddGuestInput[]): Promise<Booking> {
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
async function updateLocation(bookingUid: string, location: string): Promise<Booking> {
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
async function updateLocationV2(
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
    console.error("[CalComAPIService] updateLocationV2 error:", error);
    throw error;
  }
}

/**
 * Get recordings for a booking (Cal Video only)
 * Note: Only available for past Cal Video bookings
 * @param bookingUid - The unique identifier of the booking
 * @returns Array of recording objects with download URLs
 */
async function getRecordings(bookingUid: string): Promise<BookingRecording[]> {
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
async function getConferencingSessions(bookingUid: string): Promise<ConferencingSession[]> {
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
async function getTranscripts(bookingUid: string): Promise<BookingTranscript[]> {
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

async function getEventTypes(): Promise<EventType[]> {
  // Get current user to extract username
  let username: string | undefined;
  try {
    const currentUser = await getCurrentUser();
    // Extract username from response
    if (currentUser?.username) {
      username = currentUser.username;
    }
  } catch (_error) {}

  // Build query string with username and sorting
  const params = new URLSearchParams();
  if (username) {
    params.append("username", username);
  }
  // Sort by creation date descending (newer first) to match main codebase behavior
  // Main codebase uses position: "desc", id: "desc" - since API doesn't expose position,
  // we use sortCreatedAt: "desc" for similar behavior (newer event types first)
  params.append("sortCreatedAt", "desc");

  const queryString = params.toString();
  const endpoint = `/event-types${queryString ? `?${queryString}` : ""}`;

  const response = await makeRequest<unknown>(endpoint, {}, "2024-06-14");

  // Handle different possible response structures
  let eventTypesArray: EventType[] = [];

  if (Array.isArray(response)) {
    eventTypesArray = response as EventType[];
  } else if (response && typeof response === "object") {
    const resp = response as Record<string, unknown>;
    if (resp.data && Array.isArray(resp.data)) {
      eventTypesArray = resp.data as EventType[];
    } else if (resp.eventTypes && Array.isArray(resp.eventTypes)) {
      eventTypesArray = resp.eventTypes as EventType[];
    } else if (resp.items && Array.isArray(resp.items)) {
      eventTypesArray = resp.items as EventType[];
    } else if (resp.data && typeof resp.data === "object") {
      const dataObj = resp.data as Record<string, unknown>;
      if (dataObj.eventTypes && Array.isArray(dataObj.eventTypes)) {
        eventTypesArray = dataObj.eventTypes as EventType[];
      } else if (dataObj.items && Array.isArray(dataObj.items)) {
        eventTypesArray = dataObj.items as EventType[];
      } else {
        const keys = Object.keys(dataObj);
        if (keys.length > 0) {
          eventTypesArray = Object.values(dataObj).filter((item): item is EventType =>
            Boolean(item && typeof item === "object" && "id" in item)
          );
        }
      }
    } else {
      const possibleArrays = Object.values(resp).filter((val) => Array.isArray(val));
      if (possibleArrays.length > 0) {
        eventTypesArray = possibleArrays[0] as EventType[];
      }
    }
  }

  return eventTypesArray;
}

async function getBookingByUid(bookingUid: string): Promise<Booking> {
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
    console.error("getBookingByUid error");
    throw error;
  }
}

async function getBookings(filters?: {
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

  // Get current user to filter bookings
  let currentUser;
  try {
    currentUser = await getCurrentUser();
  } catch (_error) {
    return bookingsArray;
  }

  // Extract user info from response
  let userId: number | undefined;
  let userEmail: string | undefined;

  if (currentUser) {
    userId = currentUser.id;
    userEmail = currentUser.email;
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

// Get all schedules
async function getSchedules(): Promise<Schedule[]> {
  const response = await makeRequest<{ status: string; data: Schedule[] }>(
    "/schedules",
    {
      headers: {
        "cal-api-version": "2024-06-11", // Override version for schedules
      },
    },
    "2024-06-11"
  );

  let schedulesArray: Schedule[] = [];

  // Handle response structure: { status: "success", data: [...] }
  if (response && response.status === "success" && response.data && Array.isArray(response.data)) {
    schedulesArray = response.data;
  } else if (Array.isArray(response)) {
    // Fallback: response might be array directly
    schedulesArray = response;
  } else if (response?.data && Array.isArray(response.data)) {
    // Fallback: response.data might be array
    schedulesArray = response.data;
  }

  return schedulesArray;
}

// Create a new schedule
async function createSchedule(input: {
  name: string;
  timeZone: string;
  isDefault?: boolean;
  availability?: Array<{
    days: string[]; // e.g., ["Monday", "Tuesday"]
    startTime: string; // e.g., "09:00"
    endTime: string; // e.g., "17:00"
  }>;
  overrides?: Array<{
    date: string; // e.g., "2024-05-20"
    startTime: string; // e.g., "12:00"
    endTime: string; // e.g., "14:00"
  }>;
}): Promise<Schedule> {
  try {
    const sanitizedInput = sanitizePayload(input as Record<string, unknown>);

    const response = await makeRequest<{ status: string; data: Schedule }>(
      "/schedules",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-11",
        },
        body: JSON.stringify(sanitizedInput),
      },
      "2024-06-11"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create schedule API");
  } catch (error) {
    console.error("createSchedule error");
    throw error;
  }
}

async function getScheduleById(scheduleId: number): Promise<Schedule | null> {
  try {
    const response = await makeRequest<unknown>(
      `/schedules/${scheduleId}`,
      {
        headers: {
          "cal-api-version": "2024-06-11",
        },
      },
      "2024-06-11"
    );

    if (response && typeof response === "object") {
      const resp = response as Record<string, unknown>;
      if (resp.data && typeof resp.data === "object") {
        return resp.data as Schedule;
      }
      if (resp.id) {
        return response as Schedule;
      }
    }

    return null;
  } catch (error) {
    console.error("getScheduleById error");
    throw error;
  }
}

// Get conferencing options
async function getConferencingOptions(): Promise<ConferencingOption[]> {
  try {
    const response = await makeRequest<{
      status: string;
      data: ConferencingOption[];
    }>("/conferencing");

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getConferencingOptions error");
    throw error;
  }
}

// Get a single event type by ID
async function getEventTypeById(eventTypeId: number): Promise<EventType | null> {
  try {
    const response = await makeRequest<{ status: string; data: EventType }>(
      `/event-types/${eventTypeId}`,
      {},
      "2024-06-14"
    );

    if (response?.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    // Handle 404 errors gracefully - resource doesn't exist or user doesn't have access
    if (error instanceof Error) {
      // Check if error message contains 404 status code
      const statusMatch = error.message.match(/API Error: (\d+)/);
      if (statusMatch && statusMatch[1] === "404") {
        console.warn(`Event type ${eventTypeId} not found`);
        return null;
      }
    }
    console.error("getEventTypeById error");
    throw error;
  }
}

// Update an event type
/**
 * Sanitizes a payload before sending to the API.
 * - Removes keys with null values for array fields (API expects arrays or field to be omitted)
 * - Removes keys with undefined values
 * - Recursively sanitizes nested objects
 */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  // Fields that should NEVER be sent as null - API expects array or omit entirely
  const arrayFields = [
    "lengthInMinutesOptions",
    "multipleDuration",
    "locations",
    "bookingFields",
    "hosts",
    "children",
    "customInputs",
  ];

  // Fields that can be null (to clear the value)
  const nullableFields = [
    "description",
    "successRedirectUrl",
    "slotInterval",
    "eventName",
    "timeZone",
  ];

  for (const [key, value] of Object.entries(payload)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Handle null values
    if (value === null) {
      // For array fields, skip entirely (don't send null)
      if (arrayFields.includes(key)) {
        console.warn(`Skipping null value for array field: ${key}`);
        continue;
      }
      // For nullable fields, allow null
      if (nullableFields.includes(key)) {
        sanitized[key] = null;
        continue;
      }
      // For other fields, skip null to be safe
      console.warn(`Skipping null value for field: ${key}`);
      continue;
    }

    // Recursively sanitize nested objects (but not arrays)
    if (typeof value === "object" && !Array.isArray(value)) {
      const sanitizedNested = sanitizePayload(value as Record<string, unknown>);
      // Only include if the nested object has values
      if (Object.keys(sanitizedNested).length > 0) {
        sanitized[key] = sanitizedNested;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

async function updateEventType(
  eventTypeId: number,
  updates: Partial<CreateEventTypeInput>
): Promise<EventType> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);

    const response = await makeRequest<{ status: string; data: EventType }>(
      `/event-types/${eventTypeId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-14",
        },
        body: JSON.stringify(sanitizedUpdates),
      },
      "2024-06-14"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update event type API");
  } catch (error) {
    console.error("updateEventType error");
    throw error;
  }
}

// Update a schedule
async function updateSchedule(
  scheduleId: number,
  updates: {
    isDefault?: boolean;
    name?: string;
    timeZone?: string;
    availability?: Array<{
      days: string[]; // Day names like "Monday", "Tuesday"
      startTime: string; // Format: "09:00"
      endTime: string; // Format: "10:00"
    }>;
    overrides?: Array<{
      date: string; // Format: "2024-05-20"
      startTime: string; // Format: "12:00"
      endTime: string; // Format: "14:00"
    }>;
  }
): Promise<Schedule> {
  try {
    // Sanitize the updates to remove null values
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Schedule }>(
      `/schedules/${scheduleId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-11",
        },
        body: JSON.stringify(sanitizedUpdates),
      },
      "2024-06-11"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update schedule API");
  } catch (error) {
    console.error("updateSchedule error");
    throw error;
  }
}

// Duplicate a schedule
async function duplicateSchedule(scheduleId: number): Promise<Schedule> {
  try {
    const response = await makeRequest<{ status: string; data: Schedule }>(
      `/atoms/schedules/${scheduleId}/duplicate`,
      {
        method: "POST",
        headers: {
          "cal-api-version": "2024-06-11",
        },
      },
      "2024-06-11"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from duplicate schedule API");
  } catch (error) {
    console.error("duplicateSchedule error");
    throw error;
  }
}

// Delete a schedule
async function deleteSchedule(scheduleId: number): Promise<void> {
  try {
    await makeRequest<{ status: string }>(
      `/schedules/${scheduleId}`,
      {
        method: "DELETE",
        headers: {
          "cal-api-version": "2024-06-11",
        },
      },
      "2024-06-11"
    );
  } catch (error) {
    console.error("deleteSchedule error");
    throw error;
  }
}

// ============================================
// WEBHOOKS
// ============================================

// Get all global webhooks
async function getWebhooks(): Promise<Webhook[]> {
  try {
    const response = await makeRequest<{ status: string; data: Webhook[] }>("/webhooks");

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getWebhooks error");
    throw error;
  }
}

// Create a global webhook
async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  try {
    const sanitizedInput = sanitizePayload(input as unknown as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>("/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedInput),
    });

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create webhook API");
  } catch (error) {
    console.error("createWebhook error");
    throw error;
  }
}

// Update a global webhook
async function updateWebhook(webhookId: string, updates: UpdateWebhookInput): Promise<Webhook> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>(
      `/webhooks/${webhookId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedUpdates),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update webhook API");
  } catch (error) {
    console.error("updateWebhook error");
    throw error;
  }
}

// Delete a global webhook
async function deleteWebhook(webhookId: string): Promise<void> {
  try {
    await makeRequest(`/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteWebhook error");
    throw error;
  }
}

// Get webhooks for a specific event type
async function getEventTypeWebhooks(eventTypeId: number): Promise<Webhook[]> {
  try {
    const response = await makeRequest<{ status: string; data: Webhook[] }>(
      `/event-types/${eventTypeId}/webhooks`
    );

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getEventTypeWebhooks error");
    throw error;
  }
}

// Create a webhook for a specific event type
async function createEventTypeWebhook(
  eventTypeId: number,
  input: CreateWebhookInput
): Promise<Webhook> {
  try {
    const sanitizedInput = sanitizePayload(input as unknown as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>(
      `/event-types/${eventTypeId}/webhooks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedInput),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create event type webhook API");
  } catch (error) {
    console.error("createEventTypeWebhook error");
    throw error;
  }
}

// Update an event type webhook
async function updateEventTypeWebhook(
  eventTypeId: number,
  webhookId: string,
  updates: UpdateWebhookInput
): Promise<Webhook> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>(
      `/event-types/${eventTypeId}/webhooks/${webhookId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedUpdates),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update event type webhook API");
  } catch (error) {
    console.error("updateEventTypeWebhook error");
    throw error;
  }
}

// Delete an event type webhook
async function deleteEventTypeWebhook(eventTypeId: number, webhookId: string): Promise<void> {
  try {
    await makeRequest(`/event-types/${eventTypeId}/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteEventTypeWebhook error");
    throw error;
  }
}

// ============================================
// PRIVATE LINKS
// ============================================

// Get all private links for an event type
async function getEventTypePrivateLinks(eventTypeId: number): Promise<PrivateLink[]> {
  try {
    const response = await makeRequest<{ status: string; data: PrivateLink[] }>(
      `/event-types/${eventTypeId}/private-links`
    );

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getEventTypePrivateLinks error");
    throw error;
  }
}

// Create a private link for an event type
async function createEventTypePrivateLink(
  eventTypeId: number,
  input: CreatePrivateLinkInput = {}
): Promise<PrivateLink> {
  try {
    const sanitizedInput = sanitizePayload(input as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: PrivateLink }>(
      `/event-types/${eventTypeId}/private-links`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedInput),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create private link API");
  } catch (error) {
    console.error("createEventTypePrivateLink error");
    throw error;
  }
}

// Update a private link
async function updateEventTypePrivateLink(
  eventTypeId: number,
  linkId: number,
  updates: UpdatePrivateLinkInput
): Promise<PrivateLink> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: PrivateLink }>(
      `/event-types/${eventTypeId}/private-links/${linkId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedUpdates),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update private link API");
  } catch (error) {
    console.error("updateEventTypePrivateLink error");
    throw error;
  }
}

// Delete a private link
async function deleteEventTypePrivateLink(eventTypeId: number, linkId: number): Promise<void> {
  try {
    await makeRequest(`/event-types/${eventTypeId}/private-links/${linkId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteEventTypePrivateLink error");
    throw error;
  }
}

// Export as object to satisfy noStaticOnlyClass rule
export const CalComAPIService = {
  setAccessToken,
  setRefreshTokenFunction,
  clearAuth,
  setTokenRefreshCallback,
  getCurrentUser,
  updateUserProfile,
  getUserProfile,
  getUsername,
  buildEventTypeLink,
  clearUserProfile,
  testRawBookingsAPI,
  deleteEventType,
  createEventType,
  cancelBooking,
  rescheduleBooking,
  confirmBooking,
  declineBooking,
  markAbsent,
  addGuests,
  updateLocation,
  updateLocationV2,
  getRecordings,
  getConferencingSessions,
  getTranscripts,
  getEventTypes,
  getBookingByUid,
  getBookings,
  getSchedules,
  createSchedule,
  getScheduleById,
  getConferencingOptions,
  getEventTypeById,
  updateEventType,
  updateSchedule,
  duplicateSchedule,
  deleteSchedule,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getEventTypeWebhooks,
  createEventTypeWebhook,
  updateEventTypeWebhook,
  deleteEventTypeWebhook,
  getEventTypePrivateLinks,
  createEventTypePrivateLink,
  updateEventTypePrivateLink,
  deleteEventTypePrivateLink,
};
