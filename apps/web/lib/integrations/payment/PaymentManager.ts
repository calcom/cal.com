import { Credential } from "@prisma/client";

import { PAYMENT_INTEGRATIONS_TYPES } from "@lib/integrations/payment/constants/generals";
import { PaymentMethodServiceType } from "@lib/integrations/payment/constants/types";
import PaymentService from "@lib/integrations/payment/services/BasePaymentService";
import StripePaymentService from "@lib/integrations/payment/services/StripePaymentService";
import logger from "@lib/logger";

const log = logger.getChildLogger({ prefix: ["PaymentManager"] });

const PAYMENT_METHODS: Record<string, PaymentMethodServiceType> = {
  [PAYMENT_INTEGRATIONS_TYPES.stripe]: StripePaymentService,
};

export const getPaymentMethod = (credential: Credential): PaymentService | null => {
  const { type } = credential;

  const paymentMethod = PAYMENT_METHODS[type];
  if (!paymentMethod) {
    log.warn(`payment method of type ${type} does not implemented`);
    return null;
  }

  return new paymentMethod(credential);
};
