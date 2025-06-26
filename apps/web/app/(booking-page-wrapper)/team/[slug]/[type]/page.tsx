import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getStaticTeamEventData } from "@lib/team/[slug]/[type]/getStaticData";

import DynamicBookingComponents from "~/team/dynamic-booking-components";
import StaticTeamEventView from "~/team/static-team-event-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const staticData = await getStaticTeamEventData(legacyCtx);

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
  const staticData = await getStaticTeamEventData(legacyCtx);

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
