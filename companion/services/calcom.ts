const API_BASE_URL = "https://api.cal.com/v2";

// You'll need to set your API key here
const API_KEY = process.env.EXPO_PUBLIC_CAL_API_KEY || "your-cal-api-key-here";

export interface EventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number; // Deprecated: use lengthInMinutes instead
  lengthInMinutes?: number; // API returns this field
  locations?: Array<{
    type: string;
    address?: string;
    link?: string;
  }>;
  price?: number;
  currency?: string;
  disableGuests?: boolean;
  lockTimeZoneToggleOnBookingPage?: boolean;
  requiresConfirmation?: boolean;
  requiresBookerEmailVerification?: boolean;
  scheduleId?: number;
  userId?: number;
  teamId?: number;
  hosts?: Array<{
    userId: number;
    isFixed: boolean;
  }>;
}

export interface Booking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventTypeId: number;
  eventType?: {
    id: number;
    title: string;
    slug: string;
  };
  user?: {
    id: number;
    email: string;
    name: string;
    timeZone: string;
  };
  attendees?: Array<{
    id: number;
    email: string;
    name: string;
    timeZone: string;
    noShow?: boolean;
  }>;
  status: "ACCEPTED" | "PENDING" | "CANCELLED" | "REJECTED";
  paid?: boolean;
  payment?: Array<{
    id: number;
    success: boolean;
    paymentOption: string;
  }>;
  rescheduled?: boolean;
  fromReschedule?: string;
  recurringEventId?: string;
  smsReminderNumber?: string;
  location?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  responses?: Record<string, any>;
}

export interface GetEventTypesResponse {
  status: "success";
  data: EventType[];
}

export interface GetBookingsResponse {
  status: "success";
  data: Booking[];
}

export interface ScheduleAvailability {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface ScheduleOverride {
  date: string;
  startTime: string;
  endTime: string;
}

export interface Schedule {
  id: number;
  ownerId: number;
  name: string;
  timeZone: string;
  availability: ScheduleAvailability[];
  isDefault: boolean;
  overrides: ScheduleOverride[];
}

export interface GetSchedulesResponse {
  status: "success";
  data: Schedule[];
}

export interface GetScheduleResponse {
  status: "success";
  data: Schedule | null;
}

export class CalComAPIService {
  // Get current user information
  static async getCurrentUser(): Promise<any> {
    try {
      console.log("👤 Getting current user information...");
      const response = await this.makeRequest<any>("/me");
      console.log("👤 Current user:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch current user:", error);
      throw error;
    }
  }

  // Test function for bookings API specifically
  static async testRawBookingsAPI(): Promise<void> {
    try {
      const url = `${API_BASE_URL}/bookings?status=upcoming&status=unconfirmed&limit=50`;
      console.log("🧪📅 Testing raw bookings API call to:", url);
      console.log("🧪📅 Using API key:", API_KEY.substring(0, 20) + "...");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
      });

      console.log("🧪📅 Bookings response status:", response.status);
      console.log("🧪📅 Bookings response statusText:", response.statusText);

      const responseText = await response.text();
      console.log("🧪📅 Raw bookings response text:", responseText);

      try {
        const responseJson = JSON.parse(responseText);
        console.log("🧪📅 Parsed bookings JSON:", JSON.stringify(responseJson, null, 2));
      } catch (parseError) {
        console.log("🧪📅 Failed to parse bookings response as JSON:", parseError);
      }
    } catch (error) {
      console.error("🧪📅 Raw bookings API test failed:", error);
    }
  }

  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    apiVersion: string = "2024-08-13"
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log("🌐 Making API request to:", url);
    console.log("🔍 Request headers:", {
      Authorization: `Bearer ${API_KEY.substring(0, 20)}...`,
      "Content-Type": "application/json",
      "cal-api-version": apiVersion,
      ...options.headers,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "cal-api-version": apiVersion,
        ...options.headers,
      },
    });

    console.log("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      // Log the response body for debugging
      const errorBody = await response.text();
      console.error("❌ API Error Response Body:", errorBody);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }

  static async getEventTypes(): Promise<EventType[]> {
    try {
      // Get current user to extract username
      let username: string | undefined;
      try {
        const currentUser = await this.getCurrentUser();
        // Extract username from response (could be in data.username or directly in username)
        if (currentUser?.data?.username) {
          username = currentUser.data.username;
        } else if (currentUser?.username) {
          username = currentUser.username;
        }
        console.log("👤 EventTypes: Current user username:", username);
      } catch (error) {
        console.warn("⚠️ EventTypes: Could not get current user, proceeding without username:", error);
      }

      // Build query string with username if available
      const params = new URLSearchParams();
      if (username) {
        params.append("username", username);
      }

      const queryString = params.toString();
      const endpoint = `/event-types${queryString ? `?${queryString}` : ""}`;

      console.log("🌐 EventTypes: Requesting endpoint:", endpoint);

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
                (item) => item && typeof item === "object" && item.id
              );
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
      console.error("❌ Failed to fetch event types:", error);
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
      console.log("🚀📅 Starting API call to fetch bookings...");
      console.log("🔑📅 API Key (first 20 chars):", API_KEY.substring(0, 20) + "...");

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

      console.log("🌐📅 Bookings API URL:", `${API_BASE_URL}${endpoint}`);
      console.log("🔍📅 Query parameters:", queryString);
      console.log("🗓️📅 Filters applied:", JSON.stringify(filters, null, 2));

      const response = await this.makeRequest<any>(endpoint);

      console.log("✅📅 Bookings API Response received:", JSON.stringify(response, null, 2));
      console.log("🔍📅 Full bookings response keys:", Object.keys(response || {}));
      console.log("🔍📅 Bookings response type:", typeof response);

      // Handle different possible response structures (same logic as event types)
      let bookingsArray: Booking[] = [];

      if (Array.isArray(response)) {
        bookingsArray = response;
        console.log("📋📅 Using direct array response for bookings");
      } else if (response && typeof response === "object") {
        if (response.data && Array.isArray(response.data)) {
          bookingsArray = response.data;
          console.log("📋📅 Using response.data array for bookings");
        } else if (response.bookings && Array.isArray(response.bookings)) {
          bookingsArray = response.bookings;
          console.log("📋📅 Using response.bookings array");
        } else if (response.items && Array.isArray(response.items)) {
          bookingsArray = response.items;
          console.log("📋📅 Using response.items array for bookings");
        } else if (response.data && typeof response.data === "object") {
          console.log("🔍📅 Response.data keys:", Object.keys(response.data));

          if (response.data.bookings && Array.isArray(response.data.bookings)) {
            bookingsArray = response.data.bookings;
            console.log("📋📅 Using response.data.bookings array");
          } else if (response.data.items && Array.isArray(response.data.items)) {
            bookingsArray = response.data.items;
            console.log("📋📅 Using response.data.items array for bookings");
          } else {
            // Convert object values to array as last resort
            const keys = Object.keys(response.data);
            if (keys.length > 0) {
              bookingsArray = Object.values(response.data).filter(
                (item) => item && typeof item === "object" && (item.id || item.uid)
              );
              console.log("📋📅 Using object values as array, filtered by ID/UID for bookings");
            }
          }
        } else {
          console.log("🔍📅 Bookings response keys:", Object.keys(response));
          // Try to extract any arrays from the response
          const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
          if (possibleArrays.length > 0) {
            bookingsArray = possibleArrays[0] as Booking[];
            console.log("📋📅 Using first array found in bookings response");
          }
        }
      }

      console.log("📊📅 Processed bookings array:", bookingsArray);
      console.log("📊📅 Number of bookings before filtering:", bookingsArray.length);

      // Get current user to filter bookings
      let currentUser;
      try {
        currentUser = await this.getCurrentUser();
        console.log("👤📅 Current user for filtering:", currentUser);
      } catch (error) {
        console.error("⚠️📅 Could not get current user, returning all bookings:", error);
        return bookingsArray;
      }

      // Extract user info from response
      let userId;
      let userEmail;

      if (currentUser) {
        if (currentUser.data) {
          userId = currentUser.data.id;
          userEmail = currentUser.data.email;
        } else if (currentUser.id) {
          userId = currentUser.id;
          userEmail = currentUser.email;
        }
      }

      console.log("👤📅 Filtering bookings for user:", { userId, userEmail });

      // Filter bookings to only show ones where the current user is participating
      const userBookings = bookingsArray.filter((booking) => {
        // Check if user is the organizer (booking.user matches current user)
        const isOrganizer = booking.user && (booking.user.id === userId || booking.user.email === userEmail);

        // Check if user is an attendee
        const isAttendee =
          booking.attendees &&
          booking.attendees.some((attendee) => attendee.id === userId || attendee.email === userEmail);

        const isParticipating = isOrganizer || isAttendee;

        if (isParticipating) {
          console.log(
            "✅📅 Including booking:",
            booking.title,
            "isOrganizer:",
            isOrganizer,
            "isAttendee:",
            isAttendee
          );
        }

        return isParticipating;
      });

      console.log("📊📅 Number of user bookings after filtering:", userBookings.length);

      return userBookings;
    } catch (error) {
      console.error("❌📅 Failed to fetch bookings:", error);
      if (error instanceof Error) {
        console.error("❌📅 Error message:", error.message);
        console.error("❌📅 Error stack:", error.stack);
      }
      throw error;
    }
  }

  // Get all schedules
  static async getSchedules(): Promise<Schedule[]> {
    try {
      console.log("📅 Fetching schedules...");
      const response = await this.makeRequest<any>(
        "/schedules",
        {
          headers: {
            "cal-api-version": "2024-06-11", // Override version for schedules
          },
        },
        "2024-06-11"
      );

      console.log("📅 Schedules response:", JSON.stringify(response, null, 2));

      let schedulesArray: Schedule[] = [];

      if (Array.isArray(response)) {
        schedulesArray = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        schedulesArray = response.data;
      }

      return schedulesArray;
    } catch (error) {
      console.error("❌ Failed to fetch schedules:", error);
      throw error;
    }
  }

  // Get default schedule
  static async getDefaultSchedule(): Promise<Schedule | null> {
    try {
      console.log("📅 Fetching default schedule...");
      const response = await this.makeRequest<any>(
        "/schedules/default",
        {
          headers: {
            "cal-api-version": "2024-06-11", // Override version for schedules
          },
        },
        "2024-06-11"
      );

      console.log("📅 Default schedule response:", JSON.stringify(response, null, 2));

      if (response && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to fetch default schedule:", error);
      throw error;
    }
  }

  // Update schedule
  static async updateSchedule(
    scheduleId: number,
    data: {
      name?: string;
      timeZone?: string;
      availability?: ScheduleAvailability[];
      isDefault?: boolean;
      overrides?: ScheduleOverride[];
    }
  ): Promise<Schedule> {
    try {
      console.log("📅 Updating schedule:", scheduleId, data);
      const response = await this.makeRequest<any>(
        `/schedules/${scheduleId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
          headers: {
            "cal-api-version": "2024-06-11",
          },
        },
        "2024-06-11"
      );

      console.log("📅 Update schedule response:", JSON.stringify(response, null, 2));

      if (response && response.data) {
        return response.data;
      }

      throw new Error("Failed to update schedule");
    } catch (error) {
      console.error("❌ Failed to update schedule:", error);
      throw error;
    }
  }
}
