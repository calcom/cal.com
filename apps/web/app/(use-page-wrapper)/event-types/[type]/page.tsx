import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getEventTypeById } from "@calcom/features/eventtypes/lib/getEventTypeById";
import { getEventTypePermissions } from "@calcom/features/pbac/lib/event-type-permissions";
import prisma from "@calcom/prisma";
import { EventTypeWebWrapper } from "@calcom/web/modules/event-types/components/EventTypeWebWrapper";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { Metadata } from "next";

const querySchema = z.object({
  type: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "event-type id must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async (): Promise<Metadata> => {
  return await _generateMetadata(
    (t) => `${t("event_type")}`,
    () => "",
    undefined,
    undefined,
    "/event-types"
  );
};

async function getCachedEventType(
  eventTypeId: number,
  userId: number,
  currentOrganizationId: number | null,
  isUserOrganizationAdmin: boolean,
  userLocale: string | null
) {
  return unstable_cache(
    async () => {
      return getEventTypeById({
        eventTypeId,
        userId,
        prisma,
        currentOrganizationId,
        isUserOrganizationAdmin,
        isTrpcCall: false,
        userLocale,
      });
    },
    ["viewer.eventTypes.get", String(eventTypeId), String(userId), String(currentOrganizationId), String(isUserOrganizationAdmin), String(userLocale)],
    {
      revalidate: 3600,
      tags: [`viewer.eventTypes.get.${eventTypeId}`],
    }
  )();
}

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
  const { user } = session;
  const isOrgAdmin = user.org?.role === "OWNER" || user.org?.role === "ADMIN";

  const data = await getCachedEventType(
    eventTypeId,
    user.id,
    user.profile?.organizationId ?? null,
    isOrgAdmin,
    user.locale ?? null
  );
  if (!data?.eventType) {
    // NOTE FOR LATER, this crashes the page.
    throw new Error("This event type does not exist");
  }

  // Fetch permissions for the event type's team
  const permissions = await getEventTypePermissions(session.user.id, data.eventType.teamId);

  return <EventTypeWebWrapper data={data} id={eventTypeId} permissions={permissions} />;
};

export default ServerPage;

export const unstable_dynamicStaleTime = 30;
