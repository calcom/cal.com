import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { orgDomainConfig, getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import { getCachedTeamEvent } from "@lib/team/[slug]/[type]/getStaticData";

import DynamicBookingComponents from "~/team/dynamic-booking-components";
import StaticTeamEventView from "~/team/static-team-event-view";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

async function getTeamEventData({ params, searchParams }: PageProps) {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  const result = paramsSchema.safeParse({
    slug: legacyCtx.params?.slug,
    type: legacyCtx.params?.type,
  });

  if (!result.success) {
    // Should never happen
    return notFound();
  }

  const { slug: teamSlug, type: meetingSlug } = result.data;
  const orgSlug = legacyCtx.params?.orgSlug ?? null;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, orgSlug ?? undefined);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirectResult = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: legacyCtx.query,
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

  return teamEventData;
}

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const teamEventData = await getTeamEventData({ params, searchParams });

  const { eventData, isBrandingHidden, isSEOIndexable } = teamEventData;
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
    () => `${title} | ${profileName}`,
    () => title,
    isBrandingHidden,
    getOrgFullOrigin(eventData.entity.orgSlug ?? null),
    `/team/${decodedParams.slug}/${decodedParams.type}`
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
  const teamEventData = await getTeamEventData({ params, searchParams });
  const content = (
    <div>
      <StaticTeamEventView {...teamEventData} />
      <DynamicBookingComponents
        eventData={teamEventData.eventData}
        teamId={teamEventData.teamId}
        slug={teamEventData.slug}
        user={teamEventData.user}
        isBrandingHidden={teamEventData.isBrandingHidden}
        orgBannerUrl={teamEventData.orgBannerUrl}
      />
    </div>
  );

  const eventLocale = teamEventData.eventData?.interfaceLanguage;
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
