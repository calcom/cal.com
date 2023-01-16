import { Payment, Prisma, Booking } from "@prisma/client";

export interface IAbstractPaymentService {
  create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ): Promise<Payment>;
  update(paymentId: Payment["id"], data: Partial<Prisma.PaymentUncheckedCreateInput>): Payment;
  refund(paymentId: Payment["id"]): Payment;
  getPaymentPaidStatus(): string;
  getPaymentDetails(): Payment;
}

export abstract class AbstractPaymentService {
  abstract create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ): Promise<Payment>;

  abstract update(paymentId: Payment["id"]): Payment;

  abstract refund(paymentId: Payment["id"]): Payment;

  abstract getPaymentPaidStatus(): string;

  abstract getPaymentDetails(): Payment;
}
