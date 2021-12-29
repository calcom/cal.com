import { Payment, PaymentType, Prisma } from "@prisma/client";

import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";

import { Maybe } from "@trpc/server";

export interface PaymentSelectedEventType {
  price: number;
  currency: string;
}

export interface BookingDetail {
  user: {
    email: string | null;
    name: string | null;
    timeZone: string;
  } | null;
  id: number;
  startTime: {
    toISOString: () => string;
  };
  uid: string;
}

export interface BookingRefundDetail {
  id: number;
  uid: string;
  startTime: Date;
  payment: {
    id: number;
    success: boolean;
    refunded: boolean;
    externalId: string;
    data: Prisma.JsonValue;
    type: PaymentType;
  }[];
}

export interface bookingRefundError {
  event: CalendarEvent;
  reason: string;
  paymentId: string;
}

export interface PaymentMethodCredential {
  key: Prisma.JsonValue;
}

export interface PaymentLinkDetail {
  paymentUid: string;
  name?: Maybe<string>;
  date?: Maybe<string>;
  absolute?: boolean;
}

export interface PaymentMethod {
  handlePayment(
    event: CalendarEvent,
    selectedEventType: PaymentSelectedEventType,
    credential: PaymentMethodCredential,
    booking: BookingDetail
  ): Promise<Payment>;

  refund(booking: BookingRefundDetail, event: CalendarEvent): Promise<void>;

  handleRefundError(opts: bookingRefundError): Promise<void>;
}
