import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import TypePage, { type PageProps as ClientPageProps } from "~/team/type-view";

export const generateMetadata = async ({ params, searchParams }: ServerPageProps) => {
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
    `/team/${decodedParams.slug}/${decodedParams.type}/embed`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !isSEOIndexable),
      index: !(eventData?.hidden || !isSEOIndexable),
    },
  };
};

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  const eventLocale = props.eventData?.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <TypePage {...props} />
      </CustomI18nProvider>
    );
  }

  return <TypePage {...props} />;
};

export default ServerPage;
