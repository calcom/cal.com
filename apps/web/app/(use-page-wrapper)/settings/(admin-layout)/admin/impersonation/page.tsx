import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import ImpersonationView from "~/settings/admin/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("impersonation")
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("admin")} description={t("impersonation")}>
      <ImpersonationView />
    </SettingsHeader>
  );
};

export default Page;
