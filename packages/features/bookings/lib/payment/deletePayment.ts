import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import type { Payment, Prisma, AppCategories } from "@calcom/prisma/client";
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
  const key = paymentAppCredentials?.app?.dirName;
  const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
  if (!paymentAppImportFn) {
    console.warn(`payment app not implemented for key: ${key}`);
    return false;
  }

  const paymentAppModule = await paymentAppImportFn;
  if (!paymentAppModule?.BuildPaymentService) {
    console.warn(`payment App service not found for key: ${key}`);
    return false;
  }
  const createPaymentService = paymentAppModule.BuildPaymentService;
  const paymentInstance = createPaymentService(paymentAppCredentials) as IAbstractPaymentService;
  const deleted = await paymentInstance.deletePayment(paymentId);
  return deleted;
};

export { deletePayment };
