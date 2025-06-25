import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { headers, cookies } from "next/headers";

import { getShouldServeCache } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(legacyCtx);

  const { booking, isSEOIndexable = true, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;
  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";
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
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    getOrgFullOrigin(eventData?.entity.orgSlug ?? null),
    `/${decodedParams.user}/${decodedParams.type}`
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

async function shouldApplyISRCaching(eventData: any): Promise<boolean> {
  try {
    const teamId = eventData.teamId || eventData.owner?.profile?.organizationId;
    const shouldServeCache = await getShouldServeCache(undefined, teamId);

    if (!shouldServeCache) {
      return false;
    }

    const owner = eventData.owner;
    if (!owner) return false;

    const selectedCalendars = eventData.useEventLevelSelectedCalendars
      ? EventTypeRepository.getSelectedCalendarsFromUser({ user: owner, eventTypeId: eventData.id })
      : owner.userLevelSelectedCalendars || [];

    if (selectedCalendars.length === 0) return false;

    const allGoogleCalendar = selectedCalendars.every(
      (calendar: any) => calendar.integration === GOOGLE_CALENDAR_TYPE
    );

    return allGoogleCalendar;
  } catch (error) {
    console.error("Error checking ISR caching eligibility:", error);
    return false;
  }
}

const getCachedBookingData = unstable_cache(
  async (headers: any, cookies: any, params: any, searchParams: any) => {
    const legacyCtx = buildLegacyCtx(headers, cookies, params, searchParams);
    return await getData(legacyCtx);
  },
  ["booking-page-data"],
  {
    revalidate: 3600,
    tags: ["booking-page"],
  }
);

const getUncachedBookingData = async (headers: any, cookies: any, params: any, searchParams: any) => {
  const legacyCtx = buildLegacyCtx(headers, cookies, params, searchParams);
  return await getData(legacyCtx);
};

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const _headers = await headers();
  const _cookies = await cookies();
  const _params = await params;
  const _searchParams = await searchParams;

  const basicProps = await getUncachedBookingData(_headers, _cookies, _params, _searchParams);

  const shouldCache = await shouldApplyISRCaching(basicProps.eventData);

  const props = shouldCache
    ? await getCachedBookingData(_headers, _cookies, _params, _searchParams)
    : basicProps;

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <LegacyPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <LegacyPage {...props} />;
};

export default ServerPage;
