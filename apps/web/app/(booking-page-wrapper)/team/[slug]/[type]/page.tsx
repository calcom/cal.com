import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { notFound, redirect } from "next/navigation";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { BookingStatus } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getDynamicBookingData } from "@lib/team/[slug]/[type]/getDynamicBookingData";
import { getCachedTeamEvent } from "@lib/team/[slug]/[type]/getStaticData";

import Type from "~/team/type-view";

import { getCachedOrgContext } from "./layout";

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
  const { headers, cookies } = await import("next/headers");
  const { currentOrgDomain, teamSlug, meetingSlug } = await getCachedOrgContext(await params);

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
  };

  return <Type {...typeProps} />;
};

export default ServerPage;
