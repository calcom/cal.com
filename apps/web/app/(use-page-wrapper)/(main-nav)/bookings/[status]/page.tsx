import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { validStatuses } from "~/bookings/lib/validStatuses";
import BookingsList from "~/bookings/views/bookings-listing-view";

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const generateMetadata = async ({ params }: { params: Promise<{ status: string }> }) =>
  await _generateMetadata(
    (t) => t("bookings"),
    (t) => t("bookings_description"),
    undefined,
    undefined,
    `/bookings/${(await params).status}`
  );

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    redirect("/bookings/upcoming");
  }
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  let canListMembers = false;
  if (session?.user?.id) {
    const permissionService = new PermissionCheckService();
    const userId = session.user.id;

    const userMemberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            parentId: true,
            isOrganization: true,
          },
        },
      },
    });

    const orgMemberships = userMemberships.filter((m) => m.team.parentId === null && m.team.isOrganization);

    if (orgMemberships.length > 0) {
      for (const membership of orgMemberships) {
        const hasOrgPermission = await permissionService.checkPermission({
          userId,
          teamId: membership.teamId,
          permission: "team.listMembers",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        });
        if (hasOrgPermission) {
          canListMembers = true;
          break;
        }
      }
    } else {
      const teamIdsWithPermission = await permissionService.getTeamIdsWithPermission(
        userId,
        "team.listMembers"
      );
      canListMembers = teamIdsWithPermission.length > 0;
    }
  }

  return (
    <ShellMainAppDir heading={t("bookings")} subtitle={t("bookings_description")}>
      <BookingsList status={parsed.data.status} userId={session?.user?.id} canListMembers={canListMembers} />
    </ShellMainAppDir>
  );
};

export default Page;
