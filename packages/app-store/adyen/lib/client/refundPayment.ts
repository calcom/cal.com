import { CheckoutAPI } from "@adyen/api-library";
import type {
  CreateCheckoutSessionRequest,
  PaymentReversalRequest,
  PaymentReversalResponse,
} from "@adyen/api-library/lib/src/typings/checkout/models";
import { v4 as uuidv4 } from "uuid";

import type { Prisma } from "@calcom/prisma/client";

import type { AdyenCredentialKeys } from "../../zod";
import { createAdyenClient } from "./createClient";

interface PaymentRefundRequestParams {
  pspReference: string;
  credentials: AdyenCredentialKeys;
  payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">;
  additionalArgs?: Partial<CreateCheckoutSessionRequest>;
}

interface RefundPaymentSessionResults {
  paymentRefundResponse: PaymentReversalResponse;
  idempotencyKey: string;
}

export function refundPaymentSession({
  pspReference,
  credentials,
  payment,
  additionalArgs,
}: PaymentRefundRequestParams): Promise<RefundPaymentSessionResults> {
  // Send the request
  const idempotencyKey = uuidv4();

  const opts: PaymentReversalRequest = {
    amount: {
      value: payment.amount,
      currency: payment.currency.toLocaleUpperCase(),
    },
    merchantAccount: credentials.merchant_id,
    ...additionalArgs,
  };
  const checkoutAPI = new CheckoutAPI(createAdyenClient(credentials.api_key));
  return checkoutAPI.ModificationsApi.refundOrCancelPayment(pspReference, opts, { idempotencyKey }).then(
    (paymentRefundResponse) => ({ paymentRefundResponse, idempotencyKey })
  );
}
