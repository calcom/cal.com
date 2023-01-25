import { Payment, Prisma, Booking } from "@prisma/client";

import { CalendarEvent } from "@calcom/types/Calendar";

export interface IAbstractPaymentService {
  create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ): Promise<Payment>;
  update(paymentId: Payment["id"], data: Partial<Prisma.PaymentUncheckedCreateInput>): Promise<Payment>;
  refund(paymentId: Payment["id"]): Promise<Payment>;
  getPaymentPaidStatus(): Promise<string>;
  getPaymentDetails(): Promise<Payment>;
  afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment
  ): Promise<void>;

  deletePayment(paymentId: Payment["id"]): Promise<boolean>;
}

export abstract class AbstractPaymentService {
  abstract create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ): Promise<Payment>;

  abstract update(paymentId: Payment["id"]): Promise<Payment>;

  abstract afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment
  ): Promise<void>;

  abstract deletePayment(paymentId: Payment["id"]): Promise<boolean>;

  abstract refund(paymentId: Payment["id"]): Promise<Payment>;

  abstract getPaymentPaidStatus(): Promise<string>;

  abstract getPaymentDetails(): Promise<Payment>;
}
