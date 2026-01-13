import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { EventTypeWebWrapper } from "@calcom/web/modules/event-types/components/EventTypeWebWrapper";
import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import getEventTypeById from "@calcom/features/eventtypes/lib/getEventTypeById";
import { getEventTypePermissions } from "@calcom/features/pbac/lib/event-type-permissions";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const querySchema = z.object({
  type: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "event-type id must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("event_type")}`,
    () => "",
    undefined,
    undefined,
    "/event-types"
  );
};

const getCachedEventType = unstable_cache(
  async (
    eventTypeId: number,
    userId: number,
    currentOrganizationId: number | null,
    isUserOrganizationAdmin: boolean
  ) => {
    return await getEventTypeById({
      eventTypeId,
      userId,
      currentOrganizationId,
      isUserOrganizationAdmin,
      prisma,
      isTrpcCall: false,
    });
  },
  ["viewer.eventTypes.get"],
  { revalidate: 3600, tags: ["viewer.eventTypes.get"] }
);

const ServerPage = async ({ params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    throw new Error("Invalid Event Type id");
  }
  const eventTypeId = parsed.data.type;

  const currentOrganizationId = session.user.profile?.organizationId ?? null;
  const isUserOrganizationAdmin = checkAdminOrOwner(session.user.org?.role);

  const data = await getCachedEventType(
    eventTypeId,
    session.user.id,
    currentOrganizationId,
    isUserOrganizationAdmin
  );
  if (!data?.eventType) {
    throw new Error("This event type does not exist");
  }

  const permissions = await getEventTypePermissions(session.user.id, data.eventType.teamId);

  return <EventTypeWebWrapper data={data} id={eventTypeId} permissions={permissions} />;
};

export default ServerPage;
