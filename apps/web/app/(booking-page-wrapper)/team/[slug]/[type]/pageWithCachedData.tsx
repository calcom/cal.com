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
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import { loadTranslations } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { BookingStatus, RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx, buildLegacyRequest } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import CachedClientView, { type TeamBookingPageProps } from "~/team/type-view-cached";

import {
  getCachedTeamData,
  getCachedTeamEventType,
  getEnrichedTeamAndEventType,
  type TeamData,
  type TeamEventType,
  getCRMData,
  shouldUseApiV2ForTeamSlots,
} from "./queries";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

const getTeamMetadataForBooking = (
  teamData: NonNullable<TeamData>,
  eventType: NonNullable<TeamEventType>
) => {
  const organizationSettings = getOrganizationSEOSettings(teamData);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  return {
    orgBannerUrl: teamData.parent?.bannerUrl ?? "",
    hideBranding: shouldHideBrandingForTeamEvent({
      eventTypeId: eventType.id,
      team: teamData,
    }),
    isSEOIndexable: allowSEOIndexing,
  };
};

async function getOrgContext(params: Params) {
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

const getMultipleDurationValue = (
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

  // Use the new separated cache functions
  const [teamData, eventType] = await Promise.all([
    getCachedTeamData(teamSlug, currentOrgDomain),
    getCachedTeamEventType(teamSlug, meetingSlug, currentOrgDomain),
  ]);

  if (!teamData || !eventType) return {}; // should never happen

  const teamAndEventTypeData = await getEnrichedTeamAndEventType({
    teamSlug,
    meetingSlug,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: (await searchParams).orgRedirection === "true",
  });
  if (!teamAndEventTypeData) return {}; // should never happen

  const { hideBranding, isSEOIndexable } = getTeamMetadataForBooking(teamData, eventType);
  const title = teamAndEventTypeData.title;
  const profileName = teamAndEventTypeData.profile.name ?? "";
  const profileImage = teamAndEventTypeData.profile.image;

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [
      ...(teamAndEventTypeData?.subsetOfUsers || []).map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })),
    ],
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    () => `${title} | ${profileName}`,
    () => title,
    hideBranding,
    getOrgFullOrigin(teamAndEventTypeData.entity.orgSlug ?? null),
    `/team/${teamSlug}/${meetingSlug}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(teamAndEventTypeData.hidden || !isSEOIndexable),
      index: !(teamAndEventTypeData.hidden || !isSEOIndexable),
    },
  };
};

const CachedTeamBooker = async ({ params, searchParams }: PageProps) => {
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getOrgContext(await params);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  // Handle org redirects for non-org contexts
  if (!isOrgContext) {
    const redirectResult = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: legacyCtx.query,
    });
    if (redirectResult) return redirect(redirectResult.redirect.destination);
  }

  const [teamData, eventType] = await Promise.all([
    getCachedTeamData(teamSlug, currentOrgDomain),
    getCachedTeamEventType(teamSlug, meetingSlug, currentOrgDomain),
  ]);

  if (!teamData || !eventType) return notFound();

  const teamAndEventTypeData = await getEnrichedTeamAndEventType({
    teamSlug,
    meetingSlug,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });
  if (!teamAndEventTypeData) return notFound();

  // Handle rescheduling
  const { rescheduleUid } = legacyCtx.query;
  let bookingForReschedule: GetBookingType | null = null;
  if (rescheduleUid) {
    const session = await getServerSession({ req: legacyCtx.req });
    bookingForReschedule = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
    if (teamAndEventTypeData.disableRescheduling) return redirect(`/booking/${rescheduleUid}`);

    if (
      bookingForReschedule?.status === BookingStatus.CANCELLED &&
      legacyCtx.query.allowRescheduleForCancelledBooking !== "true" &&
      !teamAndEventTypeData.allowReschedulingCancelledBookings
    ) {
      // redirecting to the same booking page without `rescheduleUid` search param
      return redirect(`/team/${teamSlug}/${meetingSlug}`);
    }
  }

  const [crmData, useApiV2] = await Promise.all([
    getCRMData(legacyCtx.query, {
      id: eventType.id,
      isInstantEvent: eventType.isInstantEvent,
      schedulingType: eventType.schedulingType,
      metadata: eventType.metadata,
      length: teamAndEventTypeData.length,
    }),
    shouldUseApiV2ForTeamSlots(teamData.id),
  ]);

  const props: TeamBookingPageProps = {
    ...getTeamMetadataForBooking(teamData, eventType),
    ...crmData,
    useApiV2,
    isInstantMeeting: legacyCtx.query.isInstantMeeting === "true",
    eventSlug: meetingSlug,
    username: teamSlug,
    eventData: {
      ...teamAndEventTypeData,
    },
    entity: { ...teamAndEventTypeData.entity },
    bookingData: bookingForReschedule,
    isTeamEvent: true,
    durationConfig: teamAndEventTypeData.metadata?.multipleDuration,
    duration: getMultipleDurationValue(
      teamAndEventTypeData.metadata?.multipleDuration,
      legacyCtx.query.duration,
      teamAndEventTypeData.length
    ),
  };
  const Booker = <CachedClientView {...props} />;

  const eventLocale = teamAndEventTypeData.interfaceLanguage;
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
