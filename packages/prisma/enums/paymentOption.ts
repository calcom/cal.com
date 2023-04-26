import type { PaymentOption } from "@prisma/client";

export const paymentOption: { [K in PaymentOption]: K } = {
  ON_BOOKING: "ON_BOOKING",
  HOLD: "HOLD",
};

export default paymentOption;
