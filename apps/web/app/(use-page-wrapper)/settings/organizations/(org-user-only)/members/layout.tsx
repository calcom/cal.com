import SettingsLayoutAppDirClient from "app/(use-page-wrapper)/settings/(settings-layout)/SettingsLayoutAppDirClient";
import { getTranslate } from "app/_utils";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();

  return (
    <SettingsLayoutAppDirClient containerClassName="lg:max-w-screen-2xl">
      <SettingsHeader
        title={t("organization_members")}
        description={t("organization_description")}
        ctaClassName={CTA_CONTAINER_CLASS_NAME}>
        {children}
      </SettingsHeader>
    </SettingsLayoutAppDirClient>
  );
}
