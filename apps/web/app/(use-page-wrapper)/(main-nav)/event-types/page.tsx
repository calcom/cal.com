import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import EventTypes, { EventTypesCTA } from "~/event-types/views/event-types-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle"),
    undefined,
    undefined,
    "/event-types"
  );

const getCachedMe = unstable_cache(
  async (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const meCaller = await createRouterCaller(meRouter, await getTRPCContext(headers, cookies));
    return await meCaller.get();
  },
  ["viewer.me.get"],
  { revalidate: 3600 } // seconds
);

const getCachedEventGroups = unstable_cache(
  async (
    headers: ReadonlyHeaders,
    cookies: ReadonlyRequestCookies,
    filters?: {
      teamIds?: number[] | undefined;
      userIds?: number[] | undefined;
      upIds?: string[] | undefined;
    }
  ) => {
    const eventTypesCaller = await createRouterCaller(
      eventTypesRouter,
      await getTRPCContext(headers, cookies)
    );
    return await eventTypesCaller.getUserEventGroups({ filters });
  },
  ["viewer.eventTypes.getUserEventGroups"],
  { revalidate: 3600 } // seconds
);

const Page = async ({ params, searchParams }: PageProps) => {
  const _searchParams = await searchParams;
  const _headers = await headers();
  const _cookies = await cookies();
  const context = buildLegacyCtx(_headers, _cookies, await params, _searchParams);
  const session = await getServerSession({ req: context.req });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const t = await getTranslate();
  const filters = getTeamsFiltersFromQuery(_searchParams);
  const [me, userEventGroupsData] = await Promise.all([
    getCachedMe(_headers, _cookies),
    getCachedEventGroups(_headers, _cookies, filters),
  ]);

  return (
    <ShellMainAppDir
      heading={t("event_types_page_title")}
      subtitle={t("event_types_page_subtitle")}
      CTA={<EventTypesCTA userEventGroupsData={userEventGroupsData} />}>
      <EventTypes userEventGroupsData={userEventGroupsData} user={me} />
    </ShellMainAppDir>
  );
};

export default Page;
