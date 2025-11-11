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
  hosts?: Array<{
    id?: number | string;
    name?: string;
    email?: string;
    username?: string;
    timeZone?: string;
  }>;
  user?: {
    id: number;
    email: string;
    name: string;
    timeZone: string;
  };
  attendees?: Array<{
    id?: number | string;
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

export interface BookingParticipationResult {
  isOrganizer: boolean;
  isHost: boolean;
  isAttendee: boolean;
  isParticipating: boolean;
}

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
    !!booking.user && (idEq(booking.user.id, userId) || emailEq(booking.user.email, normalizedUserEmail));

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

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  timeZone: string;
  weekStart: string;
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string;
}

export class CalComAPIService {
  private static userProfile: UserProfile | null = null;
  
  // Get current user profile
  static async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await this.makeRequest<{ status: string; data: UserProfile }>("/me");
      return response.data;
    } catch (error) {
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
      } catch (parseError) {
      }
    } catch (error) {
    }
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
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }

  // Delete an event type
  static async deleteEventType(eventTypeId: number): Promise<void> {
    try {
      await this.makeRequest(`/event-types/${eventTypeId}`, {
        method: 'DELETE',
      }, '2024-06-14');
    } catch (error) {
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
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw error;
    }
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
      } catch (error) {
      }

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
                (item) => item && typeof item === "object" && (item.id || item.uid)
              );
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
      const response = await this.makeRequest<any>(
        "/schedules",
        {
          headers: {
            "cal-api-version": "2024-06-11", // Override version for schedules
          },
        },
        "2024-06-11"
      );


      let schedulesArray: Schedule[] = [];

      if (Array.isArray(response)) {
        schedulesArray = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        schedulesArray = response.data;
      }

      return schedulesArray;
    } catch (error) {
      throw error;
    }
  }

  // Get default schedule
  static async getDefaultSchedule(): Promise<Schedule | null> {
    try {
      const response = await this.makeRequest<any>(
        "/schedules/default",
        {
          headers: {
            "cal-api-version": "2024-06-11", // Override version for schedules
          },
        },
        "2024-06-11"
      );


      if (response && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
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
}
