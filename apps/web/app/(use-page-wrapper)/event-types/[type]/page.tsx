import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { EventTypeWebWrapper } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

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
  const caller = await createRouterCaller(eventTypesRouter);
  const data = await caller.get({ id: eventTypeId });
  if (!data?.eventType) {
    throw new Error("This event type does not exist");
  }

  return <EventTypeWebWrapper data={data} id={eventTypeId} />;
};

export default ServerPage;
