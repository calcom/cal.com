import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getOrgFullOrigin, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrganizationSEOSettings } from "@calcom/features/ee/organizations/lib/orgSettings";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { BookingService } from "@calcom/lib/server/service/booking";
import { EventTypeService } from "@calcom/lib/server/service/eventType";
import { type TeamWithEventTypes } from "@calcom/lib/server/service/team";
import slugify from "@calcom/lib/slugify";
import type { SchedulingType } from "@calcom/prisma/enums";
import { RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx, buildLegacyRequest } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import Type from "~/team/type-view";

import { getCachedTeamWithEventTypes, getCachedProcessedEventData } from "./actions";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

const processTeamDataForBooking = (team: TeamWithEventTypes) => {
  const organizationSettings = getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  return {
    teamId: team.id,
    orgBannerUrl: team.parent?.bannerUrl ?? "",
    isBrandingHidden: shouldHideBrandingForTeamEvent({
      eventTypeId: team.eventTypes[0]?.id,
      team,
    }),
    isSEOIndexable: allowSEOIndexing,
  };
};

export async function getOrgContext(_params: PageProps["params"]) {
  const params = await _params;
  const result = paramsSchema.safeParse({
    slug: params?.slug,
    type: params?.type,
  });

  if (!result.success) {
    return notFound();
  }

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

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getOrgContext(params);

  const team = await getCachedTeamWithEventTypes(teamSlug, meetingSlug, currentOrgDomain);
  if (!team || !team.eventTypes?.[0]) return {}; // should never happen

  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const searchParamsObj = await searchParams;
  const fromRedirectOfNonOrgLink = searchParamsObj.orgRedirection === "true";
  const eventData = await getCachedProcessedEventData(team, orgSlug, fromRedirectOfNonOrgLink);
  if (!eventData) return {}; // should never happen

  const teamData = processTeamDataForBooking(team);
  const title = eventData.title;
  const profileName = eventData.profile.name ?? "";
  const profileImage = eventData.profile.image;

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [
      ...(eventData?.users || []).map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })),
    ],
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
  const { currentOrgDomain, isValidOrgDomain, teamSlug, meetingSlug } = await getOrgContext(params);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  // Handle temporary org redirects for non-org contexts
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
  if (!team) {
    return notFound();
  }
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const fromRedirectOfNonOrgLink = legacyCtx.query.orgRedirection === "true";
  const eventData = await getCachedProcessedEventData(team, orgSlug, fromRedirectOfNonOrgLink);
  if (!eventData) {
    return notFound();
  }
  const { rescheduleUid } = legacyCtx.query;
  if (!EventTypeService.canReschedule(eventData, rescheduleUid)) {
    return redirect(`/booking/${rescheduleUid}`);
  }
  const teamData = processTeamDataForBooking(team);
  const [sessionData, crmData, useApiV2] = await Promise.all([
    BookingService.getBookingSessionData(legacyCtx.req, rescheduleUid),
    BookingService.getCRMData(legacyCtx.query, {
      id: eventData.eventTypeId,
      isInstantEvent: team.eventTypes[0].isInstantEvent,
      schedulingType: team.eventTypes[0].schedulingType as SchedulingType | null,
      metadata: team.eventTypes[0].metadata,
      length: eventData.length,
    }),
    BookingService.shouldUseApiV2ForTeamSlots(teamData.teamId),
  ]);
  const dynamicData = {
    ...sessionData,
    ...crmData,
    useApiV2,
    isInstantMeeting: legacyCtx.query.isInstantMeeting === "true",
  };

  if (
    !BookingService.canRescheduleCancelledBooking(
      dynamicData.booking,
      legacyCtx.query.allowRescheduleForCancelledBooking === "true",
      eventData
    )
  ) {
    return redirect(`/team/${teamSlug}/${meetingSlug}`);
  }

  const props = {
    ...teamData,
    ...dynamicData,
    slug: meetingSlug,
    user: teamSlug,
    eventData,
    themeBasis: null,
  };
  const ClientBooker = <Type {...props} />;

  const eventLocale = eventData.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        {ClientBooker}
      </CustomI18nProvider>
    );
  }

  return ClientBooker;
};

export default ServerPage;
