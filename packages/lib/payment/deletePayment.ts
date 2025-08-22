import type { Payment, Prisma } from "@prisma/client";

import paymentLoaders from "@calcom/app-store/_utils/payments/paymentLoaders";
import type { PaymentLoaderKey } from "@calcom/app-store/_utils/payments/paymentLoaders";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

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
  // @ts-expect-error FIXME
  const paymentApp = (await paymentLoaders[
    paymentAppCredentials?.app?.dirName as PaymentLoaderKey
  ]?.()) as PaymentApp;
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
