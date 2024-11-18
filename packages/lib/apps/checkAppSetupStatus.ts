import appStore from "@calcom/app-store";
import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import type { PaymentApp } from "@calcom/types/PaymentService";

const isObject = (obj: unknown): obj is Record<string, unknown> => {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj);
};
const isPaymentApp = (app: unknown): app is Required<PaymentApp> => {
  if (!isObject(app)) return false;
  if (!("lib" in app)) return false;
  if (!isObject(app.lib)) return false;
  if (!("PaymentService" in app.lib)) return false;

  return true;
};

const checkAppSetupStatus = async (
  credential: CredentialDataWithTeamName,
  isCategoryPayment: boolean,
  appDirName?: string
) => {
  if (!credential || !isCategoryPayment) return undefined;

  const paymentApp = await appStore[appDirName as keyof typeof appStore]?.();
  if (!isPaymentApp(paymentApp)) return undefined;

  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(credential);

  return paymentInstance.isSetupAlready();
};

export default checkAppSetupStatus;
