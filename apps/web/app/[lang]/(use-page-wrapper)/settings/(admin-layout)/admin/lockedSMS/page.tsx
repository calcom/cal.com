import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LockedSMSView from "~/settings/admin/locked-sms-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  await _generateMetadata(t("lockedSMS"), t("admin_lockedSMS_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return (
    <SettingsHeader title={t("lockedSMS")} description={t("admin_lockedSMS_description")}>
      <LockedSMSView />
    </SettingsHeader>
  );
};

export default Page;
