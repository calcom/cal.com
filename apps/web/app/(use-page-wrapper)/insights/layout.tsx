import { getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import Shell from "@calcom/features/shell/Shell";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import UpgradeTipWrapper from "./UpgradeTipWrapper";

export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const featuresRepository = new FeaturesRepository();
  const insightsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("insights");

  if (!insightsEnabled) {
    redirect("/");
  }

  const pbacFeatureEnabled = await featuresRepository.checkIfTeamHasFeature(
    session?.user.org?.id || -1,
    "pbac"
  );
  if (pbacFeatureEnabled) {
    const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: session?.user.id ?? -1,
      teamId: session?.user.org?.id ?? -1,
      permission: "insights.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
    if (!hasPermission) {
      redirect("/");
    }
  }

  const t = await getTranslate();

  return (
    <>
      <div>
        <Shell
          withoutMain={false}
          heading={t("insights")}
          subtitle={t("insights_subtitle")}
          actions={<div className={`mb-2 flex items-center gap-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
          <UpgradeTipWrapper>{children}</UpgradeTipWrapper>
        </Shell>
      </div>
    </>
  );
}
