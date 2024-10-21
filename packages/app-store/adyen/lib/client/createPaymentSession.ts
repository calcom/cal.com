import { CheckoutAPI } from "@adyen/api-library";
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
} from "@adyen/api-library/lib/src/typings/checkout/models";
import { v4 as uuidv4 } from "uuid";

import { WEBAPP_URL } from "@calcom/lib/constants";
import type { Prisma } from "@calcom/prisma/client";

import type { AdyenCredentialKeys } from "../../zod";
import { createAdyenClient } from "./createClient";

interface CreatePaymentSessionParams {
  credentials: AdyenCredentialKeys;
  payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">;
  shopperEmail: string;
  additionalArgs?: Partial<CreateCheckoutSessionRequest>;
}

interface CreatePaymentSessionResults {
  session: CreateCheckoutSessionResponse;
  idempotencyKey: string;
}

export function createPaymentSession({
  credentials,
  payment,
  shopperEmail,
  additionalArgs,
}: CreatePaymentSessionParams): Promise<CreatePaymentSessionResults> {
  const reference = uuidv4();
  const idempotencyKey = uuidv4();

  const opts: CreateCheckoutSessionRequest = {
    amount: {
      value: payment.amount,
      currency: payment.currency.toLocaleUpperCase(),
    },
    merchantAccount: credentials.merchant_id,
    reference,
    returnUrl: `${WEBAPP_URL}/payments/${reference}`,
    shopperEmail,
    ...additionalArgs,
  };
  const checkoutAPI = new CheckoutAPI(createAdyenClient(credentials.api_key));
  return checkoutAPI.PaymentsApi.sessions(opts, { idempotencyKey }).then((session) => ({
    session,
    idempotencyKey,
  }));
}
