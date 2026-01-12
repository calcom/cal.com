import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactElement } from "react";

import HealthCheckView from "~/settings/admin/healthcheck-view";

import { sendTestEmail } from "./_actions/sendTestEmail";
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
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userEmail = session?.user?.email || undefined;

  return (
    <SettingsHeader title={t("admin")} description={t("healthcheck")}>
      <HealthCheckView data={healthCheckData} userEmail={userEmail} onSendTestEmail={sendTestEmail} />
    </SettingsHeader>
  );
}

export { generateMetadata };
export default Page;
