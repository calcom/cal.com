import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import LockedSMSView from "~/settings/admin/locked-sms-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("lockedSMS"),
    (t) => t("admin_lockedSMS_description"),
    undefined,
    undefined,
    "/settings/admin/lockedSMS"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("lockedSMS")} description={t("admin_lockedSMS_description")}>
      <LockedSMSView />
    </SettingsHeader>
  );
};

export default Page;
