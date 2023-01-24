import { Payment, Prisma, Booking } from "@prisma/client";

export interface IAbstractPaymentService {
  create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ): Promise<Payment>;
  update(paymentId: Payment["id"], data: Partial<Prisma.PaymentUncheckedCreateInput>): Promise<Payment>;
  refund(paymentId: Payment["id"]): Promise<Payment>;
  getPaymentPaidStatus(): Promise<string>;
  getPaymentDetails(): Promise<Payment>;
}

export abstract class AbstractPaymentService {
  abstract create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ): Promise<Payment>;

  abstract update(paymentId: Payment["id"]): Promise<Payment>;

  abstract refund(paymentId: Payment["id"]): Promise<Payment>;

  abstract getPaymentPaidStatus(): Promise<string>;

  abstract getPaymentDetails(): Promise<Payment>;
}
