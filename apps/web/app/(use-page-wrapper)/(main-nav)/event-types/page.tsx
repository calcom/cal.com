import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import EventTypes, { EventTypesCTA } from "~/event-types/views/event-types-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle")
  );

const Page = async ({ params, searchParams }: PageProps) => {
  const _searchParams = await searchParams;
  const context = buildLegacyCtx(await headers(), await cookies(), await params, _searchParams);
  const session = await getServerSession({ req: context.req });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const t = await getTranslate();

  const caller = await createRouterCaller(eventTypesRouter);
  const filters = getTeamsFiltersFromQuery(_searchParams);
  const initialData = await caller.getUserEventGroups({ filters });

  return (
    <ShellMainAppDir
      heading={t("event_types_page_title")}
      subtitle={t("event_types_page_subtitle")}
      CTA={<EventTypesCTA initialData={initialData} filters={filters} />}>
      <EventTypes initialData={initialData} filters={filters} />
    </ShellMainAppDir>
  );
};

export default Page;
