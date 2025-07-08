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
  getCachedTeamWithEventTypes,
  getCachedEventData,
  type TeamWithEventTypes,
  getCRMData,
  shouldUseApiV2ForTeamSlots,
} from "./queries";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

const getTeamMetadataForBooking = (team: NonNullable<TeamWithEventTypes>) => {
  const organizationSettings = getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  return {
    orgBannerUrl: team.parent?.bannerUrl ?? "",
    hideBranding: shouldHideBrandingForTeamEvent({
      eventTypeId: team.eventTypes[0]?.id,
      team,
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

  const team = await getCachedTeamWithEventTypes(teamSlug, meetingSlug, currentOrgDomain);
  if (!team || !team.eventTypes?.[0]) return {}; // should never happen

  const eventData = await getCachedEventData({
    team,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: (await searchParams).orgRedirection === "true",
  });
  if (!eventData) return {}; // should never happen

  const { hideBranding, isSEOIndexable } = getTeamMetadataForBooking(team);
  const title = eventData.title;
  const profileName = eventData.profile.name ?? "";
  const profileImage = eventData.profile.image;

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [
      ...(eventData?.subsetOfUsers || []).map((user) => ({
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
    getOrgFullOrigin(eventData.entity.orgSlug ?? null),
    `/team/${teamSlug}/${meetingSlug}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData.hidden || !isSEOIndexable),
      index: !(eventData.hidden || !isSEOIndexable),
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

  const team = await getCachedTeamWithEventTypes(teamSlug, meetingSlug, currentOrgDomain);
  if (!team) return notFound();

  const eventData = await getCachedEventData({
    team,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });
  if (!eventData) return notFound();

  // Handle rescheduling
  const { rescheduleUid } = legacyCtx.query;
  let bookingForReschedule: GetBookingType | null = null;
  if (rescheduleUid) {
    const session = await getServerSession({ req: legacyCtx.req });
    bookingForReschedule = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
    if (eventData.disableRescheduling) return redirect(`/booking/${rescheduleUid}`);

    const shouldAllowRescheduleForCancelledBooking =
      legacyCtx.query.allowRescheduleForCancelledBooking === "true" &&
      eventData?.allowReschedulingCancelledBookings &&
      bookingForReschedule?.status === BookingStatus.CANCELLED;

    if (!shouldAllowRescheduleForCancelledBooking) {
      // redirecting to the same booking page without `rescheduleUid` search param
      return redirect(`/team/${teamSlug}/${meetingSlug}`);
    }
  }

  const [crmData, useApiV2] = await Promise.all([
    getCRMData(legacyCtx.query, {
      id: team.eventTypes[0].id,
      isInstantEvent: team.eventTypes[0].isInstantEvent,
      schedulingType: team.eventTypes[0].schedulingType,
      metadata: team.eventTypes[0].metadata,
      length: eventData.length,
    }),
    shouldUseApiV2ForTeamSlots(team.id),
  ]);

  const props: TeamBookingPageProps = {
    ...getTeamMetadataForBooking(team),
    ...crmData,
    useApiV2,
    isInstantMeeting: legacyCtx.query.isInstantMeeting === "true",
    eventSlug: meetingSlug,
    username: teamSlug,
    eventData: {
      ...eventData,
    },
    entity: { ...eventData.entity },
    bookingData: bookingForReschedule,
    isTeamEvent: true,
    durationConfig: eventData.metadata?.multipleDuration,
    duration: getMultipleDurationValue(
      eventData.metadata?.multipleDuration,
      legacyCtx.query.duration,
      eventData.length
    ),
  };
  const Booker = <CachedClientView {...props} />;

  const eventLocale = eventData.interfaceLanguage;
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
