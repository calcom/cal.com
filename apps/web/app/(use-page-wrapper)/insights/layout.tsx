import { getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import Shell from "@calcom/features/shell/Shell";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import UpgradeTipWrapper from "./UpgradeTipWrapper";

export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const featuresRepository = new FeaturesRepository(prisma);
  const insightsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("insights");

  if (!insightsEnabled) {
    redirect("/");
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.org?.id) {
    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: session.user.id,
      teamId: session.user.org.id,
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
