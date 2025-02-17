import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import BillingView from "~/settings/billing/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description")
  );

const Page = async () => {
  const t = await getTranslate();

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
