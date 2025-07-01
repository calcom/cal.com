import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getOrgFullOrigin, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { BookingService } from "@calcom/lib/server/service/booking";
import { EventTypeService } from "@calcom/lib/server/service/eventType";
import { TeamService } from "@calcom/lib/server/service/team";
import slugify from "@calcom/lib/slugify";
import type { SchedulingType } from "@calcom/prisma/enums";
import { RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import Type from "~/team/type-view";

import { getCachedTeamWithEventTypes, getCachedProcessedEventData } from "./actions";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

export async function getCachedOrgContext(params: any) {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, {});
  const result = paramsSchema.safeParse({
    slug: legacyCtx.params?.slug,
    type: legacyCtx.params?.type,
  });

  if (!result.success) {
    throw new Error("Invalid team slug or event type");
  }

  const { slug: teamSlug, type: meetingSlug } = result.data;
  const orgSlug = legacyCtx.params?.orgSlug ?? null;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, orgSlug ?? undefined);

  return {
    currentOrgDomain,
    isValidOrgDomain,
    teamSlug,
    meetingSlug,
  };
}

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getCachedOrgContext(
    await params
  );

  // Get team data (cached)
  const team = await getCachedTeamWithEventTypes(teamSlug, meetingSlug, currentOrgDomain);
  if (!team || !team.eventTypes?.[0]) {
    return {};
  }

  // Calculate orgSlug exactly like the original code
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;

  // Get team profile data (not cached - simple transformation)
  const profileData = TeamService.getTeamProfileData(team, orgSlug);

  // Check for fromRedirectOfNonOrgLink
  const searchParamsObj = await searchParams;
  const fromRedirectOfNonOrgLink = searchParamsObj.orgRedirection === "true";

  // Get processed event data (cached)
  const eventData = await getCachedProcessedEventData(team, orgSlug, profileData, fromRedirectOfNonOrgLink);
  if (!eventData) {
    return {};
  }

  // Get team booking data (not cached - simple transformation)
  const teamData = TeamService.processTeamDataForBooking(team);

  const title = eventData.title;
  const profileName = eventData.profile.name ?? "";
  const profileImage = eventData.profile.image;

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [],
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    () => `${title} | ${profileName}`,
    () => title,
    teamData.isBrandingHidden,
    getOrgFullOrigin(eventData.entity.orgSlug ?? null),
    `/team/${teamSlug}/${meetingSlug}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData.hidden || !teamData.isSEOIndexable),
      index: !(eventData.hidden || !teamData.isSEOIndexable),
    },
  };
};

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getCachedOrgContext(
    await params
  );
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  // Handle temporary org redirects for non-org contexts
  if (!isOrgContext) {
    const redirectResult = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: await searchParams,
    });
    if (redirectResult) redirect(redirectResult.redirect.destination);
  }

  // Get team data (cached)
  const team = await getCachedTeamWithEventTypes(teamSlug, meetingSlug, currentOrgDomain);
  if (!team || !team.eventTypes?.[0]) {
    return notFound();
  }

  // Calculate orgSlug exactly like the original code
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;

  // Get team profile data (not cached - simple transformation)
  const profileData = TeamService.getTeamProfileData(team, orgSlug);

  // Check for fromRedirectOfNonOrgLink - CRITICAL for org redirection logic
  const searchParamsObj = await searchParams;
  const fromRedirectOfNonOrgLink = searchParamsObj.orgRedirection === "true";

  // Get processed event data (cached)
  const eventData = await getCachedProcessedEventData(team, orgSlug, profileData, fromRedirectOfNonOrgLink);
  if (!eventData) {
    return notFound();
  }

  // Get team booking data (not cached - simple transformation)
  const teamData = TeamService.processTeamDataForBooking(team);

  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  const { rescheduleUid, isInstantMeeting: queryIsInstantMeeting } = legacyCtx.query;
  const allowRescheduleForCancelledBooking = legacyCtx.query.allowRescheduleForCancelledBooking === "true";

  // Validate rescheduling restrictions
  if (!EventTypeService.canReschedule(eventData, rescheduleUid)) {
    redirect(`/booking/${rescheduleUid}`);
  }

  // Get dynamic booking data (not cached - user/request specific)
  const rawEventData = {
    id: eventData.eventTypeId,
    isInstantEvent: team.eventTypes[0].isInstantEvent,
    schedulingType: team.eventTypes[0].schedulingType as SchedulingType | null,
    metadata: team.eventTypes[0].metadata,
    length: eventData.length,
  };

  const dynamicData = await BookingService.getDynamicBookingData(
    teamData.teamId,
    rescheduleUid,
    legacyCtx.query,
    legacyCtx.req,
    rawEventData,
    eventData,
    queryIsInstantMeeting === "true"
  );

  // Validate cancelled booking rescheduling
  if (
    !BookingService.canRescheduleCancelledBooking(
      dynamicData.booking,
      allowRescheduleForCancelledBooking,
      eventData
    )
  ) {
    redirect(`/team/${teamSlug}/${meetingSlug}`);
  }

  const typeProps = {
    slug: meetingSlug,
    user: teamSlug,
    booking: dynamicData.booking,
    isBrandingHidden: teamData.isBrandingHidden,
    eventData: eventData,
    isInstantMeeting: dynamicData.isInstantMeeting,
    orgBannerUrl: teamData.orgBannerUrl,
    teamMemberEmail: dynamicData.teamMemberEmail,
    crmOwnerRecordType: dynamicData.crmOwnerRecordType,
    crmAppSlug: dynamicData.crmAppSlug,
    isEmbed: false,
    useApiV2: dynamicData.useApiV2,
    teamId: teamData.teamId,
    themeBasis: null,
    isSEOIndexable: teamData.isSEOIndexable,
  };

  const eventLocale = eventData.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <Type {...typeProps} />
      </CustomI18nProvider>
    );
  }

  return <Type {...typeProps} />;
};

export default ServerPage;
