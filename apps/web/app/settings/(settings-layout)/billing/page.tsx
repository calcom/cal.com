import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { headers } from "next/headers";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import BillingView from "~/settings/billing/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

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
