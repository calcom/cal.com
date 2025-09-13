import { EventTypeWebWrapper } from "@calid/features/modules/event-types/pages/event-type";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

// import { EventTypeWebWrapper } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";
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

const getCachedEventType = unstable_cache(
  async (eventTypeId: number, headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const caller = await createRouterCaller(eventTypesRouter, await getTRPCContext(headers, cookies));
    return await caller.calid_get({ id: eventTypeId });
  },
  ["viewer.eventTypes.calid_get"],
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
  const _headers = await headers();
  const _cookies = await cookies();

  const data = await getCachedEventType(eventTypeId, _headers, _cookies);
  if (!data?.eventType) {
    throw new Error("This event type does not exist");
  }
  // const t = await getTranslate();

  return <EventTypeWebWrapper data={data} id={eventTypeId} />;

  // {
  //   /* <div className="flex w-full">
  //        <EventTypesCTA userEventGroupsData={userEventGroupsData} />
  //       <EventTypes userEventGroupsData={userEventGroupsData} user={session.user} />
  //     </div> */
  // }
};

export default ServerPage;
