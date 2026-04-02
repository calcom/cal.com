import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import ImpersonationView from "~/settings/admin/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("impersonation"),
    undefined,
    undefined,
    "/settings/admin/impersonation"
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
