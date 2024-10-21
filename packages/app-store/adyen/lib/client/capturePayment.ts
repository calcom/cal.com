import { CheckoutAPI } from "@adyen/api-library";
import type {
  CreateCheckoutSessionRequest,
  PaymentCaptureRequest,
  PaymentCaptureResponse,
} from "@adyen/api-library/lib/src/typings/checkout/models";
import { v4 as uuidv4 } from "uuid";

import type { Prisma } from "@calcom/prisma/client";

import type { AdyenCredentialKeys } from "../../zod";
import { createAdyenClient } from "./createClient";

interface PaymentCaptureRequestParams {
  pspReference: string;
  credentials: AdyenCredentialKeys;
  payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">;
  additionalArgs?: Partial<CreateCheckoutSessionRequest>;
}

interface CapturePaymentSessionResults {
  paymentCaptureResponse: PaymentCaptureResponse;
  idempotencyKey: string;
}

export function capturePaymentSession({
  pspReference,
  credentials,
  payment,
  additionalArgs,
}: PaymentCaptureRequestParams): Promise<CapturePaymentSessionResults> {
  // Send the request
  const idempotencyKey = uuidv4();

  const opts: PaymentCaptureRequest = {
    amount: {
      value: payment.amount,
      currency: payment.currency.toLocaleUpperCase(),
    },
    merchantAccount: credentials.merchant_id,
    ...additionalArgs,
  };
  const checkoutAPI = new CheckoutAPI(createAdyenClient(credentials.api_key));
  return checkoutAPI.ModificationsApi.captureAuthorisedPayment(pspReference, opts, { idempotencyKey }).then(
    (paymentCaptureResponse) => ({ paymentCaptureResponse, idempotencyKey })
  );
}
