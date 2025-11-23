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
  recurringBookingUid?: string;
  smsReminderNumber?: string;
  location?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  responses?: Record<string, any>;
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
