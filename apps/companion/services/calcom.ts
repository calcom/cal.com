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

// You'll need to set your API key here
const API_KEY = process.env.EXPO_PUBLIC_CAL_API_KEY || "your-cal-api-key-here";

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
          Authorization: `Bearer ${API_KEY}`,
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
    apiVersion: string = "2024-08-13"
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
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
        if (errorMessage.includes("expired")) {
          throw new Error("Your API key has expired. Please update it in the app settings.");
        }
        throw new Error("Authentication failed. Please check your API key.");
      }

      throw new Error(`API Error: ${errorMessage}`);
    }

    return response.json();
  }

  // Delete an event type
  static async deleteEventType(eventTypeId: number): Promise<void> {
    try {
      console.log(`Deleting event type with ID: ${eventTypeId}`);
      await this.makeRequest(
        `/event-types/${eventTypeId}`,
        {
          method: "DELETE",
        },
        "2024-06-14"
      );
      console.log("Delete completed");
    } catch (error) {
      console.error("Delete API error:", error);
      throw error;
    }
  }

  // Create an event type
  static async createEventType(input: CreateEventTypeInput): Promise<EventType> {
    try {
      console.log("Creating event type with input:", JSON.stringify(input, null, 2));

      const response = await this.makeRequest<{ status: string; data: EventType }>(
        "/event-types",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "cal-api-version": "2024-06-14",
          },
          body: JSON.stringify(input),
        },
        "2024-06-14"
      );

      if (response && response.data) {
        console.log("Event type created successfully:", response.data);
        return response.data;
      }

      throw new Error("Invalid response from create event type API");
    } catch (error) {
      console.error("createEventType error:", error);
      throw error;
    }
  }

  // Cancel a booking
  static async cancelBooking(bookingUid: string, reason?: string): Promise<void> {
    try {
      const body: { reason?: string } = {};
      if (reason) {
        body.reason = reason;
      }

      await this.makeRequest(`/bookings/${bookingUid}/cancel`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw error;
    }
  }

  // Reschedule a booking
  static async rescheduleBooking(
    bookingUid: string,
    input: {
      start: string; // ISO 8601 datetime string
      reschedulingReason?: string;
    }
  ): Promise<Booking> {
    try {
      console.log(`Rescheduling booking ${bookingUid} to:`, input.start);

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
        console.log("Booking rescheduled successfully:", response.data);
        return response.data;
      }

      throw new Error("Invalid response from reschedule booking API");
    } catch (error) {
      console.error("rescheduleBooking error:", error);
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

      // Build query string with username if available
      const params = new URLSearchParams();
      if (username) {
        params.append("username", username);
      }

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
      console.log("getBookingByUid raw response:", JSON.stringify(response, null, 2));
      if (response && response.data) {
        console.log("getBookingByUid booking data:", JSON.stringify(response.data, null, 2));
        console.log("getBookingByUid user field:", response.data.user);
        console.log("getBookingByUid hosts field:", response.data.hosts);
        console.log("getBookingByUid attendees field:", response.data.attendees);
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
      console.log("Creating schedule with input:", JSON.stringify(input, null, 2));

      const response = await this.makeRequest<{ status: string; data: Schedule }>(
        "/schedules",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "cal-api-version": "2024-06-11",
          },
          body: JSON.stringify(input),
        },
        "2024-06-11"
      );

      if (response && response.data) {
        console.log("Schedule created successfully:", response.data);
        return response.data;
      }

      throw new Error("Invalid response from create schedule API");
    } catch (error) {
      console.error("createSchedule error:", error);
      throw error;
    }
  }

  // Get specific schedule by ID
  static async getScheduleById(scheduleId: number): Promise<Schedule | null> {
    try {
      const response = await this.makeRequest<any>(
        `/schedules/${scheduleId}`,
        {
          headers: {
            "cal-api-version": "2024-06-11", // Override version for schedules
          },
        },
        "2024-06-11"
      );

      console.log("getScheduleById raw response:", JSON.stringify(response, null, 2));

      if (response && response.data) {
        console.log("Returning schedule data:", response.data);
        return response.data;
      }

      // Sometimes the response might be the schedule directly
      if (response && response.id) {
        console.log("Returning schedule directly:", response);
        return response;
      }

      console.log("No schedule data found in response");
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
  static async updateEventType(
    eventTypeId: number,
    updates: Partial<CreateEventTypeInput>
  ): Promise<EventType> {
    try {
      console.log(`Updating event type ${eventTypeId} with:`, JSON.stringify(updates, null, 2));

      const response = await this.makeRequest<{ status: string; data: EventType }>(
        `/event-types/${eventTypeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "cal-api-version": "2024-06-14",
          },
          body: JSON.stringify(updates),
        },
        "2024-06-14"
      );

      if (response && response.data) {
        console.log("Event type updated successfully:", response.data);
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
      const response = await this.makeRequest<{ status: string; data: Schedule }>(
        `/schedules/${scheduleId}`,
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
      const response = await this.makeRequest<{ status: string; data: Webhook }>("/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
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
      const response = await this.makeRequest<{ status: string; data: Webhook }>(
        `/webhooks/${webhookId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
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
      const response = await this.makeRequest<{ status: string; data: Webhook }>(
        `/event-types/${eventTypeId}/webhooks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
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
      const response = await this.makeRequest<{ status: string; data: Webhook }>(
        `/event-types/${eventTypeId}/webhooks/${webhookId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
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
      const response = await this.makeRequest<{ status: string; data: PrivateLink }>(
        `/event-types/${eventTypeId}/private-links`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
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
      const response = await this.makeRequest<{ status: string; data: PrivateLink }>(
        `/event-types/${eventTypeId}/private-links/${linkId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
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
