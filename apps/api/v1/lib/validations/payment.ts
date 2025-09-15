import { PaymentSchema } from "@calcom/prisma/zod/modelSchema/PaymentSchema";

export const schemaPaymentPublic = PaymentSchema.pick({
  id: true,
  amount: true,
  success: true,
  refunded: true,
  fee: true,
  paymentOption: true,
  currency: true,
  bookingId: true,
});
