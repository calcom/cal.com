import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import BillingView from "~/settings/billing/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("billing")}
      description={t("manage_billing_description")}
      borderInShellHeader={true}>
      <BillingView />
    </SettingsHeader>
  );
};

export default Page;
