import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import TypePage, { type PageProps as ClientPageProps } from "~/team/type-view";

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
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
