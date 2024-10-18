import appStore from "@calcom/app-store";
import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import type { PaymentApp } from "@calcom/types/PaymentService";

const checkAppSetupStatus = async (
  credential: CredentialDataWithTeamName,
  isCategoryPayment: boolean,
  appDirName?: string
) => {
  // We need to know if app is of payment type
  // undefined means that the app doesn't require app/setup/page
  let isSetupAlready = undefined;
  if (credential && isCategoryPayment) {
    const paymentApp = (await appStore[appDirName as keyof typeof appStore]?.()) as PaymentApp | null;
    if (paymentApp && "lib" in paymentApp && paymentApp?.lib && "PaymentService" in paymentApp?.lib) {
      const PaymentService = paymentApp.lib.PaymentService;
      const paymentInstance = new PaymentService(credential);
      isSetupAlready = paymentInstance.isSetupAlready();
    }
  }

  return isSetupAlready;
};

export default checkAppSetupStatus;
