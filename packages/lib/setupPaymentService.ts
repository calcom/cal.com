import paymentLoaders from "@calcom/app-store/_utils/payments/paymentLoaders";
import type { PaymentLoaderKey } from "@calcom/app-store/_utils/payments/paymentLoaders";
import type { PreparedApp } from "@calcom/app-store/_utils/prepareAppsWithCredentials";
import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import type { PaymentApp } from "@calcom/types/PaymentService";

export const setupPaymentService = async ({
  app,
  credential,
}: {
  app: Omit<PreparedApp, "credentials" | "key" | "credential">;
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
