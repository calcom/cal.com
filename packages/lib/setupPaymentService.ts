import paymentLoaders from "@calcom/app-store/_utils/payments/paymentLoaders";
import type { PaymentLoaderKey } from "@calcom/app-store/_utils/payments/paymentLoaders";
import type getApps from "@calcom/app-store/utils";
import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import type { PaymentApp } from "@calcom/types/PaymentService";

type EnabledApp = ReturnType<typeof getApps>[number] & { enabled: boolean };

export const setupPaymentService = async ({
  app,
  credential,
}: {
  app: Omit<EnabledApp, "credentials" | "key" | "credential">;
  credential: CredentialDataWithTeamName;
}) => {
  // @ts-expect-error FIXME
  const paymentApp = (await paymentLoaders[app.dirName as PaymentLoaderKey]?.()) as PaymentApp | null;
  if (paymentApp && "lib" in paymentApp && paymentApp?.lib && "PaymentService" in paymentApp?.lib) {
    const PaymentService = paymentApp.lib.PaymentService;
    const paymentInstance = new PaymentService(credential);

    const isPaymentSetupAlready = paymentInstance.isSetupAlready();

    return isPaymentSetupAlready;
  }
};
