import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CreateTeamEventType, LayoutWrapper } from "~/settings/teams/[id]/event-types-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("add_new_team_event_type"),
    (t) => t("new_event_type_to_book_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/event-type`
  );

const querySchema = z.object({
  id: z.coerce.number().refine((val) => !Number.isNaN(val), {
    message: "id must be a string that can be cast to a number",
  }),
});

const ServerPage = async ({ params }: ServerPageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    notFound();
  }

  const permissionService = new PermissionCheckService();
  const canCreateEventType = await permissionService.checkPermission({
    userId: session.user.id,
    teamId: parsed.data.id,
    permission: "eventType.create",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  return (
    <LayoutWrapper>
      <CreateTeamEventType permissions={{ canCreateEventType }} />
    </LayoutWrapper>
  );
};

export default ServerPage;
