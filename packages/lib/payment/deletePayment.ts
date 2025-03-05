import type { Payment, Prisma } from "@prisma/client";

import type { AppCategories } from "@calcom/prisma/enums";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

import { PaymentAppMap } from "../../app-store/payment.apps.generated";

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
  const paymentApp = (await PaymentAppMap[
    paymentAppCredentials?.app?.dirName as keyof typeof PaymentAppMap
  ]) as PaymentApp | null;
  if (!paymentApp?.lib?.PaymentService) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return false;
  }
  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;
  return await paymentInstance.deletePayment(paymentId);
};

export { deletePayment };
