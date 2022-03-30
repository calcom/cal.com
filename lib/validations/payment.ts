import { withValidation } from "next-validations";

import { _PaymentModel as Payment } from "@calcom/prisma/zod";

export const schemaPaymentBodyParams = Payment.omit({ id: true });

export const schemaPaymentPublic = Payment.omit({});

export const withValidPayment = withValidation({
  schema: schemaPaymentBodyParams,
  type: "Zod",
  mode: "body",
});
