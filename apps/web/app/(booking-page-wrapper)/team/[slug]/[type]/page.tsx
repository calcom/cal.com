import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { getCachedTeamEvent } from "app/cache/event-type";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { orgDomainConfig, getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import DynamicBookingComponents from "~/team/dynamic-booking-components";
import StaticTeamEventView from "~/team/static-team-event-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const teamSlug = Array.isArray(legacyCtx.params?.slug)
    ? legacyCtx.params.slug[0]
    : legacyCtx.params?.slug ?? null;
  const meetingSlug = Array.isArray(legacyCtx.params?.type)
    ? legacyCtx.params.type[0]
    : legacyCtx.params?.type ?? null;
  const orgSlug = Array.isArray(legacyCtx.params?.orgSlug)
    ? legacyCtx.params.orgSlug[0]
    : legacyCtx.params?.orgSlug ?? null;

  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, orgSlug ?? undefined);

  if (!isValidOrgDomain && teamSlug && meetingSlug) {
    const redirectResult = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: "Team" as any,
      eventTypeSlug: meetingSlug,
      currentQuery: legacyCtx.query,
    });

    if (redirectResult) {
      redirect(redirectResult.redirect.destination);
    }
  }

  const staticData = await getCachedTeamEvent({
    teamSlug,
    meetingSlug,
    orgSlug: currentOrgDomain,
  });

  if (!staticData) return {};

  const { eventData, isBrandingHidden } = staticData;
  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [],
  };

  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${title} | ${profileName}`,
    (t) => title,
    isBrandingHidden,
    getOrgFullOrigin(eventData.entity.orgSlug ?? null),
    `/team/${decodedParams.slug}/${decodedParams.type}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !staticData.isSEOIndexable),
      index: !(eventData?.hidden || !staticData.isSEOIndexable),
    },
  };
};

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const teamSlug = Array.isArray(legacyCtx.params?.slug)
    ? legacyCtx.params.slug[0]
    : legacyCtx.params?.slug ?? null;
  const meetingSlug = Array.isArray(legacyCtx.params?.type)
    ? legacyCtx.params.type[0]
    : legacyCtx.params?.type ?? null;
  const orgSlug = Array.isArray(legacyCtx.params?.orgSlug)
    ? legacyCtx.params.orgSlug[0]
    : legacyCtx.params?.orgSlug ?? null;

  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, orgSlug ?? undefined);

  if (!isValidOrgDomain && teamSlug && meetingSlug) {
    const redirectResult = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: "Team" as any,
      eventTypeSlug: meetingSlug,
      currentQuery: legacyCtx.query,
    });

    if (redirectResult) {
      redirect(redirectResult.redirect.destination);
    }
  }

  const staticData = await getCachedTeamEvent({
    teamSlug,
    meetingSlug,
    orgSlug: currentOrgDomain,
  });

  if (!staticData) {
    return <div>Event not found</div>;
  }

  const eventLocale = staticData.eventData?.interfaceLanguage;

  const content = (
    <div>
      <StaticTeamEventView {...staticData} />
      <Suspense fallback={<div>Loading calendar and booking options...</div>}>
        <DynamicBookingComponents
          eventData={staticData.eventData}
          teamId={staticData.teamId}
          slug={staticData.slug}
          user={staticData.user}
          isBrandingHidden={staticData.isBrandingHidden}
          orgBannerUrl={staticData.orgBannerUrl}
        />
      </Suspense>
    </div>
  );

  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        {content}
      </CustomI18nProvider>
    );
  }

  return content;
};

export default ServerPage;
