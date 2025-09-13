import type { Prisma } from "@calcom/prisma/client";

export const paymentSelect = {
  id: true,
  amount: true,
  success: true,
  refunded: true,
  fee: true,
  paymentOption: true,
  currency: true,
  bookingId: true,
} satisfies Prisma.PaymentSelect;
