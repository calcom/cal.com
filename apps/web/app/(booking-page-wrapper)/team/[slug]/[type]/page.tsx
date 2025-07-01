import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getOrgFullOrigin, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { BookingStatus, RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import { getDynamicBookingData } from "@lib/team/[slug]/[type]/getDynamicBookingData";
import { getCachedTeamEvent } from "@lib/team/[slug]/[type]/getStaticData";

import Type from "~/team/type-view";

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
  const { currentOrgDomain, teamSlug, meetingSlug } = await getCachedOrgContext(await params);

  const teamEventData = await getCachedTeamEvent({
    teamSlug,
    meetingSlug,
    orgSlug: currentOrgDomain,
  });

  if (!teamEventData) {
    return {};
  }

  const { eventData, isBrandingHidden, isSEOIndexable } = teamEventData;
  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [],
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    () => `${title} | ${profileName}`,
    () => title,
    isBrandingHidden,
    getOrgFullOrigin(eventData.entity.orgSlug ?? null),
    `/team/${teamSlug}/${meetingSlug}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !isSEOIndexable),
      index: !(eventData?.hidden || !isSEOIndexable),
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

  const teamEventData = await getCachedTeamEvent({
    teamSlug,
    meetingSlug,
    orgSlug: currentOrgDomain,
  });

  if (!teamEventData) {
    return notFound();
  }

  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  const { rescheduleUid, isInstantMeeting: queryIsInstantMeeting } = legacyCtx.query;
  const allowRescheduleForCancelledBooking = legacyCtx.query.allowRescheduleForCancelledBooking === "true";

  if (rescheduleUid && teamEventData.eventData.disableRescheduling) {
    redirect(`/booking/${rescheduleUid}`);
  }

  const dynamicData = await getDynamicBookingData({
    teamId: teamEventData.teamId,
    rescheduleUid,
    query: legacyCtx.query,
    req: legacyCtx.req,
    eventData: teamEventData.eventData,
    isInstantMeetingQuery: queryIsInstantMeeting === "true",
  });

  if (
    dynamicData.booking?.status === BookingStatus.CANCELLED &&
    !allowRescheduleForCancelledBooking &&
    !teamEventData.eventData.allowReschedulingCancelledBookings
  ) {
    redirect(`/team/${teamSlug}/${meetingSlug}`);
  }

  const typeProps = {
    slug: meetingSlug,
    user: teamSlug,
    booking: dynamicData.booking,
    isBrandingHidden: teamEventData.isBrandingHidden,
    eventData: teamEventData.eventData,
    isInstantMeeting: dynamicData.isInstantMeeting,
    orgBannerUrl: teamEventData.orgBannerUrl,
    teamMemberEmail: dynamicData.teamMemberEmail,
    crmOwnerRecordType: dynamicData.crmOwnerRecordType,
    crmAppSlug: dynamicData.crmAppSlug,
    isEmbed: false,
    useApiV2: dynamicData.useApiV2,
    teamId: teamEventData.teamId,
    themeBasis: null,
    isSEOIndexable: teamEventData.isSEOIndexable,
  };

  const eventLocale = teamEventData.eventData?.interfaceLanguage;
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
