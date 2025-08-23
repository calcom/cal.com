import paymentLoaders, { type PaymentLoaderKey } from "@calcom/app-store/_utils/payments/paymentLoaders";
import type { PaymentApp } from "@calcom/types/PaymentService";

export const setupPaymentService = async () => {
  console.log("Checking payment setup for app", app.name);
  // @ts-expect-error FIXME
  const paymentApp = (await paymentLoaders[app.dirName as PaymentLoaderKey]?.()) as PaymentApp | null;
  if (paymentApp && "lib" in paymentApp && paymentApp?.lib && "PaymentService" in paymentApp?.lib) {
    const PaymentService = paymentApp.lib.PaymentService;
    const paymentInstance = new PaymentService(credential);

    const isPaymentSetupAlready = paymentInstance.isSetupAlready();

    return isPaymentSetupAlready;
  }
};
