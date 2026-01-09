import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps, Params, SearchParams } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import LegacyPage from "~/team/type-view";
import type { PageProps as LegacyPageProps } from "~/team/type-view";

import CachedTeamBooker, {
  generateMetadata as generateCachedMetadata,
  getOrgContext,
} from "./pageWithCachedData";
import { getTeamId } from "./queries";

async function isCachedTeamBookingEnabled(params: Params, searchParams: SearchParams): Promise<boolean> {
  if (searchParams.experimentalTeamBookingPageCache !== "true") return false;

  const { teamSlug, currentOrgDomain, isValidOrgDomain } = await getOrgContext(params);
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const teamId = await getTeamId(teamSlug, orgSlug);

  if (!teamId) return false;

  const featuresRepository = new FeaturesRepository(prisma);
  const isTeamFeatureEnabled = await featuresRepository.checkIfTeamHasFeature(
    teamId,
    "team-booking-page-cache"
  );
  return isTeamFeatureEnabled;
}

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  if (await isCachedTeamBookingEnabled(await params, await searchParams)) {
    return await generateCachedMetadata({ params, searchParams });
  }

  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(legacyCtx);
  const { booking, isSEOIndexable, eventData, isBrandingHidden } = props;

  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";
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
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${booking?.uid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${booking?.uid ? t("reschedule") : ""} ${title}`,
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

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  if (await isCachedTeamBookingEnabled(await params, await searchParams)) {
    return await CachedTeamBooker({ params, searchParams });
  }

  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const eventLocale = props.eventData?.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <LegacyPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <LegacyPage {...props} />;
};

export default ServerPage;
