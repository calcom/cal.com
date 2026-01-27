import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

import type { PageProps as TeamTypePageProps } from "~/team/type-view";
import TeamTypePage from "~/team/type-view";
import UserTypePage from "~/users/views/users-type-public-view";
import type { PageProps as UserTypePageProps } from "~/users/views/users-type-public-view";

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

export type ClientPageProps = UserTypePageProps | TeamTypePageProps;

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  const eventLocale = props.eventData?.interfaceLanguage;
  const ns = "common";
  const translations = await loadTranslations(eventLocale ?? "en", ns);

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
