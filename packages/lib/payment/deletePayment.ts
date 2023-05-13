import type { Payment, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

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
  const paymentApp = await appStore[paymentAppCredentials?.app?.dirName as keyof typeof appStore]();
  if (!(paymentApp && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
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
