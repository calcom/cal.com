import type {
  EventType,
  CreateEventTypeInput,
  GetEventTypesResponse,
  Booking,
  GetBookingsResponse,
  BookingParticipationResult,
  Schedule,
  GetSchedulesResponse,
  GetScheduleResponse,
  UserProfile,
  ConferencingOption,
  Webhook,
  CreateWebhookInput,
  UpdateWebhookInput,
  PrivateLink,
  CreatePrivateLinkInput,
  UpdatePrivateLinkInput,
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

export class CalComAPIService {
  private static userProfile: UserProfile | null = null;

  /**
   * Set OAuth access token for authentication
   */
  static setAccessToken(accessToken: string, refreshToken?: string): void {
    authConfig.accessToken = accessToken;
    if (refreshToken) {
      authConfig.refreshToken = refreshToken;
    }
  }

  /**
   * Set refresh token function for automatic token refresh
   */
  static setRefreshTokenFunction(
    refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>
  ): void {
    refreshTokenFunction = refreshFn;
  }

  /**
   * Clear all authentication
   */
  static clearAuth(): void {
    authConfig.accessToken = undefined;
    authConfig.refreshToken = undefined;
    tokenRefreshCallback = null;
    refreshTokenFunction = null;
  }

  /**
   * Set token refresh callback for OAuth token refresh
   */
  static setTokenRefreshCallback(
    callback: (accessToken: string, refreshToken?: string) => Promise<void>
  ): void {
    tokenRefreshCallback = callback;
  }

  /**
   * Get current authentication header
   */
  private static getAuthHeader(): string {
    if (authConfig.accessToken) {
      return `Bearer ${authConfig.accessToken}`;
    } else {
      throw new Error("No authentication configured. Please sign in with OAuth.");
    }
  }

  // Get current user profile
  static async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await this.makeRequest<{ status: string; data: UserProfile }>(
        "/me",
        {
          headers: {
            "cal-api-version": "2024-06-11",
          },
        },
        "2024-06-11"
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update current user profile
  static async updateUserProfile(updates: {
    email?: string;
    name?: string;
    timeFormat?: number;
    defaultScheduleId?: number;
    weekStart?: string;
    timeZone?: string;
    locale?: string;
    avatarUrl?: string;
    bio?: string;
    metadata?: Record<string, any>;
  }): Promise<UserProfile> {
    try {
      const response = await this.makeRequest<{ status: string; data: UserProfile }>(
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

      if (response && response.data) {
        // Update cached profile
        this.userProfile = response.data;
        return response.data;
      }

      throw new Error("Invalid response from update user profile API");
    } catch (error) {
      console.error("updateUserProfile error:", error);
      throw error;
    }
  }

  // Get and cache user profile
  static async getUserProfile(): Promise<UserProfile> {
    if (this.userProfile) {
      return this.userProfile;
    }

    this.userProfile = await this.getCurrentUser();
    return this.userProfile;
  }

  // Get cached username or fetch if not available
  static async getUsername(): Promise<string> {
    const profile = await this.getUserProfile();
    return profile.username;
  }

  // Build shareable link for event type
  static async buildEventTypeLink(eventTypeSlug: string): Promise<string> {
    const username = await this.getUsername();
    return `https://cal.com/${username}/${eventTypeSlug}`;
  }

  // Clear cached profile (useful for logout)
  static clearUserProfile(): void {
    this.userProfile = null;
  }

  // Test function for bookings API specifically
  static async testRawBookingsAPI(): Promise<void> {
    try {
      const url = `${API_BASE_URL}/bookings?status=upcoming&status=unconfirmed&limit=50`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
      });

      const responseText = await response.text();

      try {
        const responseJson = JSON.parse(responseText);
      } catch (parseError) {}
    } catch (error) {}
  }

  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    apiVersion: string = "2024-08-13",
    isRetry: boolean = false
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.getAuthHeader(),
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
      } catch (parseError) {
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
            return this.makeRequest<T>(endpoint, options, apiVersion, true);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            this.clearAuth();
            throw new Error("Authentication failed. Please sign in again.");
          }
        }

        if (errorMessage.includes("expired")) {
          throw new Error("Your authentication has expired. Please sign in again.");
        }
        throw new Error("Authentication failed. Please check your credentials.");
      }

      throw new Error(`API Error: ${errorMessage}`);
    }

    return response.json();
  }

  static async deleteEventType(eventTypeId: number): Promise<void> {
    try {
      await this.makeRequest(
        `/event-types/${eventTypeId}`,
        {
          method: "DELETE",
        },
        "2024-06-14"
      );
    } catch (error) {
      console.error("Delete API error:", error);
      throw error;
    }
  }

  static async createEventType(input: CreateEventTypeInput): Promise<EventType> {
    try {
      const sanitizedInput = this.sanitizePayload(input as Record<string, any>);

      const response = await this.makeRequest<{ status: string; data: EventType }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from create event type API");
    } catch (error) {
      console.error("createEventType error:", error);
      throw error;
    }
  }

  // Cancel a booking
  static async cancelBooking(bookingUid: string, cancellationReason?: string): Promise<void> {
    try {
      const body: { cancellationReason?: string } = {};
      if (cancellationReason) {
        body.cancellationReason = cancellationReason;
      }

      await this.makeRequest(
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
    } catch (error) {
      throw error;
    }
  }

  static async rescheduleBooking(
    bookingUid: string,
    input: {
      start: string;
      reschedulingReason?: string;
    }
  ): Promise<Booking> {
    try {
      const response = await this.makeRequest<{ status: string; data: Booking }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from reschedule booking API");
    } catch (error) {
      console.error("rescheduleBooking error:", error);
      throw error;
    }
  }

  static async confirmBooking(bookingUid: string): Promise<Booking> {
    try {
      const response = await this.makeRequest<{ status: string; data: Booking }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from confirm booking API");
    } catch (error) {
      console.error("confirmBooking error:", error);
      throw error;
    }
  }

  static async declineBooking(bookingUid: string, reason?: string): Promise<Booking> {
    try {
      const body: { reason?: string } = {};
      if (reason) {
        body.reason = reason;
      }

      const response = await this.makeRequest<{ status: string; data: Booking }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from decline booking API");
    } catch (error) {
      console.error("declineBooking error:", error);
      throw error;
    }
  }

  static async getEventTypes(): Promise<EventType[]> {
    try {
      // Get current user to extract username
      let username: string | undefined;
      try {
        const currentUser = await this.getCurrentUser();
        // Extract username from response
        if (currentUser?.username) {
          username = currentUser.username;
        }
      } catch (error) {}

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

      const response = await this.makeRequest<any>(endpoint, {}, "2024-06-14");

      // Handle different possible response structures
      let eventTypesArray: EventType[] = [];

      if (Array.isArray(response)) {
        eventTypesArray = response;
      } else if (response && typeof response === "object") {
        if (response.data && Array.isArray(response.data)) {
          eventTypesArray = response.data;
        } else if (response.eventTypes && Array.isArray(response.eventTypes)) {
          eventTypesArray = response.eventTypes;
        } else if (response.items && Array.isArray(response.items)) {
          eventTypesArray = response.items;
        } else if (response.data && typeof response.data === "object") {
          if (response.data.eventTypes && Array.isArray(response.data.eventTypes)) {
            eventTypesArray = response.data.eventTypes;
          } else if (response.data.items && Array.isArray(response.data.items)) {
            eventTypesArray = response.data.items;
          } else {
            const keys = Object.keys(response.data);
            if (keys.length > 0) {
              eventTypesArray = Object.values(response.data).filter(
                (item): item is EventType => item && typeof item === "object" && "id" in item
              ) as EventType[];
            }
          }
        } else {
          const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
          if (possibleArrays.length > 0) {
            eventTypesArray = possibleArrays[0] as EventType[];
          }
        }
      }

      return eventTypesArray;
    } catch (error) {
      throw error;
    }
  }

  static async getBookingByUid(bookingUid: string): Promise<Booking> {
    try {
      const response = await this.makeRequest<{ status: string; data: Booking }>(
        `/bookings/${bookingUid}`,
        {
          headers: {
            "cal-api-version": "2024-08-13",
          },
        },
        "2024-08-13"
      );
      if (response && response.data) {
        return response.data;
      }
      throw new Error("Invalid response from get booking API");
    } catch (error) {
      console.error("getBookingByUid error:", error);
      throw error;
    }
  }

  static async getBookings(filters?: {
    status?: string[];
    fromDate?: string;
    toDate?: string;
    eventTypeId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Booking[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters?.status?.length) {
        filters.status.forEach((status) => params.append("status", status));
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

      const response = await this.makeRequest<any>(endpoint);

      // Handle different possible response structures (same logic as event types)
      let bookingsArray: Booking[] = [];

      if (Array.isArray(response)) {
        bookingsArray = response;
      } else if (response && typeof response === "object") {
        if (response.data && Array.isArray(response.data)) {
          bookingsArray = response.data;
        } else if (response.bookings && Array.isArray(response.bookings)) {
          bookingsArray = response.bookings;
        } else if (response.items && Array.isArray(response.items)) {
          bookingsArray = response.items;
        } else if (response.data && typeof response.data === "object") {
          if (response.data.bookings && Array.isArray(response.data.bookings)) {
            bookingsArray = response.data.bookings;
          } else if (response.data.items && Array.isArray(response.data.items)) {
            bookingsArray = response.data.items;
          } else {
            // Convert object values to array as last resort
            const keys = Object.keys(response.data);
            if (keys.length > 0) {
              bookingsArray = Object.values(response.data).filter(
                (item): item is Booking =>
                  item && typeof item === "object" && ("id" in item || "uid" in item)
              ) as Booking[];
            }
          }
        } else {
          // Try to extract any arrays from the response
          const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
          if (possibleArrays.length > 0) {
            bookingsArray = possibleArrays[0] as Booking[];
          }
        }
      }

      // Get current user to filter bookings
      let currentUser;
      try {
        currentUser = await this.getCurrentUser();
      } catch (error) {
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
        const { isOrganizer, isHost, isAttendee, isParticipating } = getBookingParticipation(
          booking,
          userId,
          userEmail
        );

        return isParticipating;
      });

      return userBookings;
    } catch (error) {
      throw error;
    }
  }

  // Get all schedules
  static async getSchedules(): Promise<Schedule[]> {
    try {
      const response = await this.makeRequest<{ status: string; data: Schedule[] }>(
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
      if (
        response &&
        response.status === "success" &&
        response.data &&
        Array.isArray(response.data)
      ) {
        schedulesArray = response.data;
      } else if (Array.isArray(response)) {
        // Fallback: response might be array directly
        schedulesArray = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Fallback: response.data might be array
        schedulesArray = response.data;
      }

      return schedulesArray;
    } catch (error) {
      throw error;
    }
  }

  // Create a new schedule
  static async createSchedule(input: {
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
      const sanitizedInput = this.sanitizePayload(input as Record<string, any>);

      const response = await this.makeRequest<{ status: string; data: Schedule }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from create schedule API");
    } catch (error) {
      console.error("createSchedule error:", error);
      throw error;
    }
  }

  static async getScheduleById(scheduleId: number): Promise<Schedule | null> {
    try {
      const response = await this.makeRequest<any>(
        `/schedules/${scheduleId}`,
        {
          headers: {
            "cal-api-version": "2024-06-11",
          },
        },
        "2024-06-11"
      );

      if (response && response.data) {
        return response.data;
      }

      if (response && response.id) {
        return response;
      }

      return null;
    } catch (error) {
      console.error("getScheduleById error:", error);
      throw error;
    }
  }

  // Get conferencing options
  static async getConferencingOptions(): Promise<ConferencingOption[]> {
    try {
      const response = await this.makeRequest<{ status: string; data: ConferencingOption[] }>(
        "/conferencing"
      );

      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("getConferencingOptions error:", error);
      throw error;
    }
  }

  // Get a single event type by ID
  static async getEventTypeById(eventTypeId: number): Promise<EventType | null> {
    try {
      const response = await this.makeRequest<{ status: string; data: EventType }>(
        `/event-types/${eventTypeId}`,
        {},
        "2024-06-14"
      );

      if (response && response.data) {
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
      console.error("getEventTypeById error:", error);
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
  private static sanitizePayload(payload: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

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
        const sanitizedNested = this.sanitizePayload(value);
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

  static async updateEventType(
    eventTypeId: number,
    updates: Partial<CreateEventTypeInput>
  ): Promise<EventType> {
    try {
      const sanitizedUpdates = this.sanitizePayload(updates as Record<string, any>);

      const response = await this.makeRequest<{ status: string; data: EventType }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from update event type API");
    } catch (error) {
      console.error("updateEventType error:", error);
      throw error;
    }
  }

  // Update a schedule
  static async updateSchedule(
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
      const sanitizedUpdates = this.sanitizePayload(updates as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: Schedule }>(
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

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from update schedule API");
    } catch (error) {
      console.error("updateSchedule error:", error);
      throw error;
    }
  }

  // Duplicate a schedule
  static async duplicateSchedule(scheduleId: number): Promise<Schedule> {
    try {
      const response = await this.makeRequest<{ status: string; data: Schedule }>(
        `/atoms/schedules/${scheduleId}/duplicate`,
        {
          method: "POST",
          headers: {
            "cal-api-version": "2024-06-11",
          },
        },
        "2024-06-11"
      );

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from duplicate schedule API");
    } catch (error) {
      console.error("duplicateSchedule error:", error);
      throw error;
    }
  }

  // Delete a schedule
  static async deleteSchedule(scheduleId: number): Promise<void> {
    try {
      await this.makeRequest<{ status: string }>(
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
      console.error("deleteSchedule error:", error);
      throw error;
    }
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  // Get all global webhooks
  static async getWebhooks(): Promise<Webhook[]> {
    try {
      const response = await this.makeRequest<{ status: string; data: Webhook[] }>("/webhooks");

      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("getWebhooks error:", error);
      throw error;
    }
  }

  // Create a global webhook
  static async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    try {
      const sanitizedInput = this.sanitizePayload(input as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: Webhook }>("/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedInput),
      });

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from create webhook API");
    } catch (error) {
      console.error("createWebhook error:", error);
      throw error;
    }
  }

  // Update a global webhook
  static async updateWebhook(webhookId: string, updates: UpdateWebhookInput): Promise<Webhook> {
    try {
      const sanitizedUpdates = this.sanitizePayload(updates as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: Webhook }>(
        `/webhooks/${webhookId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizedUpdates),
        }
      );

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from update webhook API");
    } catch (error) {
      console.error("updateWebhook error:", error);
      throw error;
    }
  }

  // Delete a global webhook
  static async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.makeRequest(`/webhooks/${webhookId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("deleteWebhook error:", error);
      throw error;
    }
  }

  // Get webhooks for a specific event type
  static async getEventTypeWebhooks(eventTypeId: number): Promise<Webhook[]> {
    try {
      const response = await this.makeRequest<{ status: string; data: Webhook[] }>(
        `/event-types/${eventTypeId}/webhooks`
      );

      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("getEventTypeWebhooks error:", error);
      throw error;
    }
  }

  // Create a webhook for a specific event type
  static async createEventTypeWebhook(
    eventTypeId: number,
    input: CreateWebhookInput
  ): Promise<Webhook> {
    try {
      const sanitizedInput = this.sanitizePayload(input as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: Webhook }>(
        `/event-types/${eventTypeId}/webhooks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizedInput),
        }
      );

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from create event type webhook API");
    } catch (error) {
      console.error("createEventTypeWebhook error:", error);
      throw error;
    }
  }

  // Update an event type webhook
  static async updateEventTypeWebhook(
    eventTypeId: number,
    webhookId: string,
    updates: UpdateWebhookInput
  ): Promise<Webhook> {
    try {
      const sanitizedUpdates = this.sanitizePayload(updates as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: Webhook }>(
        `/event-types/${eventTypeId}/webhooks/${webhookId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizedUpdates),
        }
      );

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from update event type webhook API");
    } catch (error) {
      console.error("updateEventTypeWebhook error:", error);
      throw error;
    }
  }

  // Delete an event type webhook
  static async deleteEventTypeWebhook(eventTypeId: number, webhookId: string): Promise<void> {
    try {
      await this.makeRequest(`/event-types/${eventTypeId}/webhooks/${webhookId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("deleteEventTypeWebhook error:", error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE LINKS
  // ============================================

  // Get all private links for an event type
  static async getEventTypePrivateLinks(eventTypeId: number): Promise<PrivateLink[]> {
    try {
      const response = await this.makeRequest<{ status: string; data: PrivateLink[] }>(
        `/event-types/${eventTypeId}/private-links`
      );

      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("getEventTypePrivateLinks error:", error);
      throw error;
    }
  }

  // Create a private link for an event type
  static async createEventTypePrivateLink(
    eventTypeId: number,
    input: CreatePrivateLinkInput = {}
  ): Promise<PrivateLink> {
    try {
      const sanitizedInput = this.sanitizePayload(input as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: PrivateLink }>(
        `/event-types/${eventTypeId}/private-links`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizedInput),
        }
      );

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from create private link API");
    } catch (error) {
      console.error("createEventTypePrivateLink error:", error);
      throw error;
    }
  }

  // Update a private link
  static async updateEventTypePrivateLink(
    eventTypeId: number,
    linkId: number,
    updates: UpdatePrivateLinkInput
  ): Promise<PrivateLink> {
    try {
      const sanitizedUpdates = this.sanitizePayload(updates as Record<string, any>);
      const response = await this.makeRequest<{ status: string; data: PrivateLink }>(
        `/event-types/${eventTypeId}/private-links/${linkId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizedUpdates),
        }
      );

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Invalid response from update private link API");
    } catch (error) {
      console.error("updateEventTypePrivateLink error:", error);
      throw error;
    }
  }

  // Delete a private link
  static async deleteEventTypePrivateLink(eventTypeId: number, linkId: number): Promise<void> {
    try {
      await this.makeRequest(`/event-types/${eventTypeId}/private-links/${linkId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("deleteEventTypePrivateLink error:", error);
      throw error;
    }
  }
}
