import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { getUserEventGroupsData } from "@calcom/features/eventtypes/lib/getUserEventGroups";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { EventTypesWrapper } from "./EventTypesWrapper";

const getCachedEventGroups = unstable_cache(
  async (
    userId: number,
    userUpId: string,
    filters?: {
      teamIds?: number[] | undefined;
      userIds?: number[] | undefined;
      upIds?: string[] | undefined;
    }
  ) => {
    return await getUserEventGroupsData({ userId, userUpId, filters });
  },
  ["viewer.eventTypes.getUserEventGroups"],
  { revalidate: 3600, tags: ["viewer.eventTypes.getUserEventGroups"] }
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

  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    return redirect(onboardingPath);
  }

  if (!session.user.profile?.upId) {
    return redirect("/auth/login");
  }

  const filters = getTeamsFiltersFromQuery(_searchParams);
  const userEventGroupsData = await getCachedEventGroups(
    session.user.id,
    session.user.profile.upId,
    filters
  );

  return (
    <EventTypesWrapper
      userEventGroupsData={userEventGroupsData}
      user={session.user}
    />
  );
};

export const generateMetadata = async (): Promise<
  ReturnType<typeof _generateMetadata>
> =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle"),
    undefined,
    undefined,
    "/event-types"
  );

export default Page;
