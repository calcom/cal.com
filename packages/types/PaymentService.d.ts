import type { Payment, Prisma, Booking, PaymentOption } from "@prisma/client";

import type { PaymentService } from "@calcom/app-store/paypal/lib/PaymentService";
import type { CalendarEvent } from "@calcom/types/Calendar";

export interface PaymentApp {
  lib?: {
    PaymentService: typeof PaymentService;
  };
}

export interface IAbstractPaymentService {
  /* This method is for creating charges at the time of booking */
  create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string | null,
    bookerEmail: string,
    paymentOption: PaymentOption,
    eventTitle?: string,
    bookingTitle?: string
  ): Promise<Payment>;
  /* This method is to collect card details to charge at a later date ex. no-show fees */
  collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    bookerEmail: string,
    paymentOption: PaymentOption
  ): Promise<Payment>;
  chargeCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId?: Booking["id"]
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
  isSetupAlready(): boolean;
}
