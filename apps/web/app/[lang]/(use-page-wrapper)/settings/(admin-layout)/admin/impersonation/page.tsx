import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import ImpersonationView from "~/settings/admin/impersonation-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return await _generateMetadata(t("admin"), t("impersonation"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return (
    <SettingsHeader title={t("admin")} description={t("impersonation")}>
      <ImpersonationView />
    </SettingsHeader>
  );
};

export default Page;
