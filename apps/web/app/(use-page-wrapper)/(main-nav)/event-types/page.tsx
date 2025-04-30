import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
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

const Page = async ({ params, searchParams }: PageProps) => {
  const _searchParams = await searchParams;
  const context = buildLegacyCtx(await headers(), await cookies(), await params, _searchParams);
  const session = await getServerSession({ req: context.req });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const t = await getTranslate();
  const filters = getTeamsFiltersFromQuery(_searchParams);

  const [meCaller, eventTypesCaller] = await Promise.all([
    createRouterCaller(meRouter),
    createRouterCaller(eventTypesRouter),
  ]);

  const [me, userEventGroupsData] = await Promise.all([
    meCaller.get(),
    eventTypesCaller.getUserEventGroups({ filters }),
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
export const revalidate = 3600; // 1 hour in seconds
