import { getTranslate } from "app/_utils";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("organization_members")}
      description={t("organization_description")}
      ctaClassName={CTA_CONTAINER_CLASS_NAME}>
      {children}
    </SettingsHeader>
  );
}
