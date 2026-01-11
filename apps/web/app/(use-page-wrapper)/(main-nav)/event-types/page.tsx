import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import EventTypes, { EventTypesCTA } from "~/event-types/views/event-types-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle"),
    undefined,
    undefined,
    "/event-types"
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

const Page = async ({ searchParams }: PageProps) => {
  const _searchParams = await searchParams;
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  // Check if user needs onboarding and redirect before fetching event types data
  // Use organizationId from session profile if available to avoid extra query
  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    return redirect(onboardingPath);
  }

  const t = await getTranslate();
  const filters = getTeamsFiltersFromQuery(_searchParams);
  const userEventGroupsData = await getCachedEventGroups(_headers, _cookies, filters);

  return (
    <ShellMainAppDir
      heading={t("event_types_page_title")}
      subtitle={t("event_types_page_subtitle")}
      CTA={<EventTypesCTA userEventGroupsData={userEventGroupsData} />}>
      <EventTypes userEventGroupsData={userEventGroupsData} user={session.user} />
    </ShellMainAppDir>
  );
};

export default Page;
