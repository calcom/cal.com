import { _PaymentModel as Payment } from "@calcom/prisma/zod/payment";

export const schemaPaymentPublic = Payment.pick({
  id: true,
  amount: true,
  success: true,
  refunded: true,
  fee: true,
  paymentOption: true,
  currency: true,
  bookingId: true,
});
