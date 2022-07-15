import { paymentConfigEventType as paymentConfigEventSchema } from "@calcom/prisma/zod-utils";
import type { PaymentConfig } from "@calcom/types/Calendar";

export function isPaymentConfig(obj: unknown): obj is PaymentConfig {
  const parsedRecuEvt = paymentConfigEventSchema.safeParse(obj);
  return parsedRecuEvt.success;
}

export function parsePaymentConfig(obj: unknown): PaymentConfig | null {
  let paymentConfig: PaymentConfig | null = null;
  if (isPaymentConfig(obj)) paymentConfig = obj;
  return paymentConfig;
}
