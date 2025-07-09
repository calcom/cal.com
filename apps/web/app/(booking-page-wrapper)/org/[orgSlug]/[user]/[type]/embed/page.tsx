import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

import type { PageProps as TeamTypePageProps } from "~/team/type-view";
import TeamTypePage from "~/team/type-view";
import UserTypePage from "~/users/views/users-type-public-view";
import type { PageProps as UserTypePageProps } from "~/users/views/users-type-public-view";

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

export type ClientPageProps = UserTypePageProps | TeamTypePageProps;

export const generateMetadata = async ({ params, searchParams }: ServerPageProps) => {
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
      ...(
        (eventData as UserTypePageProps["eventData"])?.subsetOfUsers ??
        (eventData as TeamTypePageProps["eventData"])?.users ??
        []
      ).map((user) => ({
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
    `/${decodedParams.user}/${decodedParams.type}/embed`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !isSEOIndexable),
      index: !(eventData?.hidden || !isSEOIndexable),
    },
  };
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  const eventLocale = props.eventData?.interfaceLanguage;
  const ns = "common";
  let translations;
  if (eventLocale) {
    const ns = "common";
    translations = await loadTranslations(eventLocale, ns);
  }

  if ((props as TeamTypePageProps)?.teamId) {
    return eventLocale ? (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <TeamTypePage {...(props as TeamTypePageProps)} />
      </CustomI18nProvider>
    ) : (
      <TeamTypePage {...(props as TeamTypePageProps)} />
    );
  }

  return eventLocale ? (
    <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
      <UserTypePage {...(props as UserTypePageProps)} />
    </CustomI18nProvider>
  ) : (
    <UserTypePage {...(props as UserTypePageProps)} />
  );
};

export default ServerPage;
