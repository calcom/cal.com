import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TeamFeaturesView from "~/settings/teams/[id]/features-view";

type PageParams = { params: Promise<{ id: string }> };

export const generateMetadata = async ({ params }: PageParams): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/features`
  );

const Page = async ({ params }: PageParams) => {
  const { id } = await params;
  const teamId = Number(id);

  if (Number.isNaN(teamId)) {
    return notFound();
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return notFound();
  }

  const membership = await prisma.membership.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      accepted: true,
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    return notFound();
  }

  const { canRead, canEdit } = await getResourcePermissions({
    userId: session.user.id,
    teamId,
    resource: Resource.FeatureOptIn,
    userRole: membership.role,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canRead) {
    return redirect(`/settings/teams/${teamId}/profile`);
  }

  return <TeamFeaturesView teamId={teamId} canEdit={canEdit} />;
};

export default Page;
