import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import type { RouterOutputs } from "@calcom/trpc/react";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { EventTypesWrapper } from "./EventTypesWrapper";

const getCachedEventGroups: (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  filters?: {
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    upIds?: string[] | undefined;
  }
) => Promise<RouterOutputs["viewer"]["eventTypes"]["getUserEventGroups"]> = unstable_cache(
  async (
    headers: ReadonlyHeaders,
    cookies: ReadonlyRequestCookies,
    filters?: {
      teamIds?: number[] | undefined;
      userIds?: number[] | undefined;
      upIds?: string[] | undefined;
    }
  ): Promise<RouterOutputs["viewer"]["eventTypes"]["getUserEventGroups"]> => {
    const eventTypesCaller = await createRouterCaller(
      eventTypesRouter,
      await getTRPCContext(headers, cookies)
    );
    return await eventTypesCaller.getUserEventGroups({ filters });
  },
  ["viewer.eventTypes.getUserEventGroups"],
  { revalidate: 3600 } // seconds
);

const Page = async ({ searchParams }: PageProps): Promise<ReactElement> => {
  const _searchParams = await searchParams;
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({
    req: buildLegacyRequest(_headers, _cookies),
  });
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

  const filters = getTeamsFiltersFromQuery(_searchParams);
  const userEventGroupsData = await getCachedEventGroups(_headers, _cookies, filters);

  return <EventTypesWrapper userEventGroupsData={userEventGroupsData} user={session.user} />;
};

export const generateMetadata = async (): Promise<ReturnType<typeof _generateMetadata>> =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle"),
    undefined,
    undefined,
    "/event-types"
  );

export default Page;
