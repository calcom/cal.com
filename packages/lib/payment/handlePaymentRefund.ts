import type { Payment, Prisma } from "@prisma/client";

import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const handlePaymentRefund = async (
  paymentId: Payment["id"],
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: string | null;
    app: {
      dirName: string;
      categories: AppCategories[];
    } | null;
  }
) => {
  const key = paymentAppCredentials?.app?.dirName;
  const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
  if (!paymentAppImportFn) {
    console.warn(`payment app not implemented for key: ${key}`);
    return false;
  }

  const paymentAppModule = await paymentAppImportFn;
  if (!paymentAppModule?.PaymentService) {
    console.warn(`payment App service not found for key: ${key}`);
    return false;
  }
  const PaymentService = paymentAppModule.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;
  const refund = await paymentInstance.refund(paymentId);
  return refund;
};

export { handlePaymentRefund };
