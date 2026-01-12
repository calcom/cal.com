export type BookingStatus = "accepted" | "pending" | "cancelled" | "rejected";

export interface Booking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  start?: string;
  end?: string;
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
    absent?: boolean;
  }>;
  status: BookingStatus;
  paid?: boolean;
  payment?: Array<{
    id: number;
    success: boolean;
    paymentOption: string;
  }>;
  rescheduled?: boolean;
  fromReschedule?: string;
  recurringEventId?: string;
  recurringBookingUid?: string;
  requiresConfirmation?: boolean;
  smsReminderNumber?: string;
  location?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  responses?: Record<string, unknown>;
  // Additional fields from API
  guests?: string[];
  bookingFieldsResponses?: Record<string, unknown>;
  rescheduledFromUid?: string;
  rescheduledToUid?: string;
  reschedulingReason?: string;
  cancelledByEmail?: string;
  absentHost?: boolean;
  duration?: number;
  meetingUrl?: string;
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

// Mark No Show / Absent Types
export interface MarkAbsentAttendee {
  email: string;
  absent: boolean;
}

export interface MarkAbsentRequest {
  attendees: MarkAbsentAttendee[];
}

export interface MarkAbsentResponse {
  status: "success" | "error";
  data: Booking;
}

// ============================================================================
// Add Guests Types
// ============================================================================

export interface AddGuestInput {
  email: string;
  name?: string;
}

export interface AddGuestsRequest {
  guests: AddGuestInput[];
}

export interface AddGuestsResponse {
  status: "success" | "error";
  data: Booking;
}

// ============================================================================
// Update Location Types
// ============================================================================

export interface UpdateLocationRequest {
  location: string;
}

export interface UpdateLocationResponse {
  status: "success" | "error";
  data: Booking;
}

// ============================================================================
// Recordings Types
// ============================================================================

export interface BookingRecording {
  id: string;
  roomName: string;
  startTime: string;
  endTime?: string;
  downloadUrl: string;
  duration?: number;
}

export interface GetRecordingsResponse {
  status: "success" | "error";
  data: BookingRecording[];
  message?: string;
}

// ============================================================================
// Conferencing Sessions Types
// ============================================================================

export interface ConferencingSessionParticipant {
  id: string;
  userId?: string;
  userName?: string;
  joinTime: string;
  duration?: number;
}

export interface ConferencingSession {
  id: string;
  roomName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  maxParticipants?: number;
  participants?: ConferencingSessionParticipant[];
}

export interface GetConferencingSessionsResponse {
  status: "success" | "error";
  data: ConferencingSession[];
}

// ============================================================================
// Transcripts Types
// ============================================================================

export interface BookingTranscript {
  id: string;
  roomName: string;
  startTime: string;
  downloadUrl: string;
}

export interface GetTranscriptsResponse {
  status: "success" | "error";
  data: BookingTranscript[];
  message?: string;
}
