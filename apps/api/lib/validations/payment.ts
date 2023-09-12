import { _PaymentModel as Payment } from "@calcom/prisma/zod";

// FIXME: Payment seems a delicate endpoint, do we need to remove anything here?
export const schemaPaymentBodyParams = Payment.omit({ id: true });
export const schemaPaymentPublic = Payment.omit({ externalId: true });
