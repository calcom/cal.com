import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";
import type { ReactElement } from "react";

import HealthCheckView from "~/settings/admin/healthcheck-view";

import { getHealthCheckData } from "./_queries";

async function generateMetadata(): Promise<Metadata> {
  return await _generateMetadata(
    (t) => t("admin"),
    (t) => t("healthcheck"),
    undefined,
    undefined,
    "/settings/admin/healthcheck"
  );
}

async function Page(): Promise<ReactElement> {
  const t = await getTranslate();
  const healthCheckData = await getHealthCheckData();

  return (
    <SettingsHeader title={t("admin")} description={t("healthcheck")}>
      <HealthCheckView data={healthCheckData} />
    </SettingsHeader>
  );
}

export { generateMetadata };
export default Page;
