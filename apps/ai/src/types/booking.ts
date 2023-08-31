export enum BOOKING_STATUS {
  ACCEPTED = "ACCEPTED",
  PENDING = "PENDING",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export type Booking = {
  id: number;
  userId: number;
  description: string | null;
  eventTypeId: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: { email: string; name: string; timeZone: string; locale: string }[] | null;
  user: { email: string; name: string; timeZone: string; locale: string }[] | null;
  payment: { id: number; success: boolean; paymentOption: string }[];
  metadata: object | null;
  status: BOOKING_STATUS;
  responses: { email: string; name: string; location: string } | null;
};
