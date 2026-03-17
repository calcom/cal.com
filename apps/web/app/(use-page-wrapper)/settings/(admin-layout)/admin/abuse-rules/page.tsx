import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import AbuseRulesView from "~/abuse-rules/components/AbuseRulesView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("abuse_rules"),
    (t) => t("abuse_rules_description"),
    undefined,
    undefined,
    "/settings/admin/abuse-rules"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session || session.user.role !== UserPermissionRole.ADMIN) {
    redirect("/settings");
  }

  const t = await getTranslate();
  return (
    <SettingsHeader title={t("abuse_rules")} description={t("abuse_rules_description")}>
      <AbuseRulesView />
    </SettingsHeader>
  );
};

export default Page;
