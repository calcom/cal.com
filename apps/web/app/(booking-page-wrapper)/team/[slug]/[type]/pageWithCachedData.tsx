import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps, Params } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule, type GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getOrgFullOrigin, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrganizationSEOSettings } from "@calcom/features/ee/organizations/lib/orgSettings";
import type { TeamData } from "@calcom/features/ee/teams/lib/getTeamData";
import { shouldHideBrandingForTeamEvent } from "@calcom/features/profile/lib/hideBranding";
import { loadTranslations } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { BookingStatus, RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx, buildLegacyRequest } from "@lib/buildLegacyCtx";
import { handleOrgRedirect } from "@lib/handleOrgRedirect";

import CachedClientView, { type TeamBookingPageProps } from "~/team/type-view-cached";

import { getCachedTeamData, getEnrichedEventType, getCRMData, shouldUseApiV2ForTeamSlots } from "./queries";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

const _getTeamMetadataForBooking = (teamData: NonNullable<TeamData>, eventTypeId: number) => {
  const organizationSettings = getOrganizationSEOSettings(teamData);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  return {
    orgBannerUrl: teamData.parent?.bannerUrl ?? "",
    hideBranding: shouldHideBrandingForTeamEvent({
      eventTypeId,
      team: teamData,
    }),
    isSEOIndexable: allowSEOIndexing,
  };
};

export async function getOrgContext(params: Params) {
  const result = paramsSchema.safeParse({
    slug: params?.slug,
    type: params?.type,
  });

  if (!result.success) return notFound(); // should never happen

  const { slug: teamSlug, type: meetingSlug } = result.data;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(
    buildLegacyRequest(await headers(), await cookies()),
    params?.orgSlug ?? undefined
  );

  return {
    currentOrgDomain,
    isValidOrgDomain,
    teamSlug,
    meetingSlug,
  };
}

const _getMultipleDurationValue = (
  multipleDurationConfig: number[] | undefined,
  queryDuration: string | string[] | null | undefined,
  defaultValue: number
) => {
  if (!multipleDurationConfig) return null;
  if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
  return defaultValue;
};

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getOrgContext(await params);

  const teamData = await getCachedTeamData(teamSlug, currentOrgDomain);
  if (!teamData) return {}; // should never happen

  const enrichedEventType = await getEnrichedEventType({
    teamSlug,
    meetingSlug,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: (await searchParams).orgRedirection === "true",
  });
  if (!enrichedEventType) return {}; // should never happen

  const title = enrichedEventType.title;
  const profileName = enrichedEventType.profile.name ?? "";
  const profileImage = enrichedEventType.profile.image;

  const teamIsPrivate = teamData.isPrivate;

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    // Hide team member names in preview if team is private
    users: teamIsPrivate
      ? []
      : [
          ...(enrichedEventType?.subsetOfUsers || []).map((user) => ({
            name: `${user.name}`,
            username: `${user.username}`,
          })),
        ],
  };

  const { hideBranding, isSEOIndexable } = _getTeamMetadataForBooking(teamData, enrichedEventType.id);

  const metadata = await generateMeetingMetadata(
    meeting,
    () => `${title} | ${profileName}`,
    () => title,
    hideBranding,
    getOrgFullOrigin(enrichedEventType.entity.orgSlug ?? null),
    `/team/${teamSlug}/${meetingSlug}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(enrichedEventType.hidden || !isSEOIndexable),
      index: !(enrichedEventType.hidden || !isSEOIndexable),
    },
  };
};

const CachedTeamBooker = async ({ params, searchParams }: PageProps) => {
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getOrgContext(await params);
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  // Handle org redirects
  const redirectResult = await handleOrgRedirect({
    slugs: [teamSlug],
    redirectType: RedirectType.Team,
    eventTypeSlug: meetingSlug,
    context: legacyCtx,
    currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
  });
  if (redirectResult) return redirect(redirectResult.redirect.destination);

  const teamData = await getCachedTeamData(teamSlug, currentOrgDomain);

  if (!teamData) return notFound();

  const enrichedEventType = await getEnrichedEventType({
    teamSlug,
    meetingSlug,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });
  if (!enrichedEventType) return notFound();

  // Handle rescheduling
  const { rescheduleUid } = legacyCtx.query;
  let bookingForReschedule: GetBookingType | null = null;
  if (rescheduleUid) {
    const session = await getServerSession({ req: legacyCtx.req });
    bookingForReschedule = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
    if (enrichedEventType.disableRescheduling) return redirect(`/booking/${rescheduleUid}`);

    if (
      bookingForReschedule?.status === BookingStatus.CANCELLED &&
      legacyCtx.query.allowRescheduleForCancelledBooking !== "true" &&
      !enrichedEventType.allowReschedulingCancelledBookings
    ) {
      // redirecting to the same booking page without `rescheduleUid` search param
      return redirect(`/team/${teamSlug}/${meetingSlug}`);
    }
  }

  const [crmData, useApiV2] = await Promise.all([
    getCRMData(legacyCtx.query, {
      id: enrichedEventType.id,
      isInstantEvent: enrichedEventType.isInstantEvent,
      schedulingType: enrichedEventType.schedulingType,
      metadata: enrichedEventType.metadata,
      length: enrichedEventType.length,
    }),
    shouldUseApiV2ForTeamSlots(teamData.id),
  ]);

  const props: TeamBookingPageProps = {
    ..._getTeamMetadataForBooking(teamData, enrichedEventType.id),
    ...crmData,
    useApiV2,
    isInstantMeeting: legacyCtx.query.isInstantMeeting === "true",
    eventSlug: meetingSlug,
    username: teamSlug,
    eventData: {
      ...enrichedEventType,
    },
    entity: { ...enrichedEventType.entity },
    bookingData: bookingForReschedule,
    isTeamEvent: true,
    durationConfig: enrichedEventType.metadata?.multipleDuration,
    duration: _getMultipleDurationValue(
      enrichedEventType.metadata?.multipleDuration,
      legacyCtx.query.duration,
      enrichedEventType.length
    ),
  };
  const Booker = <CachedClientView {...props} />;

  const eventLocale = enrichedEventType.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        {Booker}
      </CustomI18nProvider>
    );
  }

  return Booker;
};

export default CachedTeamBooker;
