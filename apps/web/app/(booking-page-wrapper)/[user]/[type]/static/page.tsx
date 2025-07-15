import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import LegacyPage from "~/users/views/users-type-public-view";

export const revalidate = 3600;

const getCachedBookingData = unstable_cache(
  async (legacyCtx: any) => {
    return await getServerSideProps(legacyCtx);
  },
  ["booking-page-data"],
  {
    revalidate: 3600,
    tags: ["booking-page", "user-booking", "event-booking"],
  }
);

const getCachedAvailabilityData = unstable_cache(
  async (input: any, ctx: any) => {
    const availableSlotsService = getAvailableSlotsService();
    return await availableSlotsService.getAvailableSlots({ ctx, input });
  },
  ["availability-data"],
  {
    revalidate: 1800,
    tags: ["availability-data", "user-availability", "event-availability"],
  }
);

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const result = await getCachedBookingData(legacyCtx);

  if ("redirect" in result || "notFound" in result) {
    return {};
  }

  const props = result.props;
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

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const result = await getCachedBookingData(legacyCtx);

  if ("redirect" in result && result.redirect) {
    redirect(result.redirect.destination);
  }
  if ("notFound" in result) {
    notFound();
  }

  const props = result.props;

  const availabilityInput = {
    usernameList: getUsernameList(props.user),
    eventTypeSlug: props.slug,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    timeZone: "UTC",
    isTeamEvent: false,
  };

  const availabilityData = await getCachedAvailabilityData(availabilityInput, legacyCtx);

  const propsWithAvailability = {
    ...props,
    initialAvailabilityData: availabilityData,
    availabilityInput,
  };

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <LegacyPage {...propsWithAvailability} />
      </CustomI18nProvider>
    );
  }

  return <LegacyPage {...propsWithAvailability} />;
};

export default ServerPage;
