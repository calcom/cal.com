import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { EventTypeWebWrapper } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import getEventTypeById from "@calcom/lib/event-types/getEventTypeById";

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
    user: { id: number; organization?: { isOrgAdmin?: boolean }; profile?: { organizationId?: number } }
  ) => {
    const prisma = (await import("@calcom/prisma")).default;

    return await getEventTypeById({
      eventTypeId,
      userId: user.id,
      prisma,
      isTrpcCall: false,
      isUserOrganizationAdmin: !!user?.organization?.isOrgAdmin,
      currentOrganizationId: user.profile?.organizationId ?? null,
    });
  },
  ["viewer.eventTypes.get"],
  { revalidate: 3600 } // Cache for 1 hour
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

  const data = await getCachedEventType(eventTypeId, session.user);
  if (!data?.eventType) {
    throw new Error("This event type does not exist");
  }

  return <EventTypeWebWrapper data={data} id={eventTypeId} />;
};

export default ServerPage;
