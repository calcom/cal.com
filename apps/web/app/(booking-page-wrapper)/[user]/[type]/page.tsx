import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { unstable_cache } from 'next/cache';

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {

  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  delete legacyCtx.res; // appDir can't talk to the response object, so let's just delete it

  const { isSEOIndexable = true, eventData, isBrandingHidden } = await getCachedData(legacyCtx);
  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";
  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users:
      eventData?.subsetOfUsers.map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })) || [],
  };
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    () => `${title} | ${profileName}`,
    () => title,
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
const getCachedData = unstable_cache(async (ctx: { 
  req: GetServerSidePropsContext["req"], 
  params: GetServerSidePropsContext["params"],
  query: GetServerSidePropsContext["query"],
}) => getData(ctx));

const ServerPage = async ({ params, searchParams }: PageProps) => {

  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  delete legacyCtx.res;

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
