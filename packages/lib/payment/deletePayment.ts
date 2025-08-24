import type { Payment, Prisma } from "@prisma/client";

import { PAYMENT_APPS } from "@calcom/app-store/payment.apps.generated";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const loadPaymentApp = async (dir?: string) => {
  if (!dir) return null;
  const factory = (PAYMENT_APPS as Record<string, () => Promise<any>>)[dir];
  return factory ? await factory() : null;
};

const deletePayment = async (
  paymentId: Payment["id"],
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: string | null;
    app: {
      dirName: string;
      categories: AppCategories[];
    } | null;
  }
): Promise<boolean> => {
  const paymentApp = await loadPaymentApp(paymentAppCredentials?.app?.dirName);
  if (!paymentApp?.lib?.PaymentService) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PaymentService = paymentApp.lib.PaymentService as any;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;
  const deleted = await paymentInstance.deletePayment(paymentId);
  return deleted;
};

export { deletePayment };
