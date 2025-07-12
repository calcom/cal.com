import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import type { GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { cache } from "react";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

const _cachedServerSideProps = cache(async (ctx: GetServerSidePropsContext) => {
  return await getServerSideProps(ctx);
});

const getCachedData = withAppDirSsr<LegacyPageProps>(_cachedServerSideProps);

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const decodedParams = decodeParams(await params);
  const props = await getCachedData(legacyCtx);

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
  const props = await getCachedData(legacyCtx);

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
