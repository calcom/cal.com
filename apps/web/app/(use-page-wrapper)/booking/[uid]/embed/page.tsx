import { loadTranslations } from "@calcom/lib/server/i18n";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps as ServerPageProps } from "app/_types";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { cookies, headers } from "next/headers";

import OldPage from "~/bookings/views/bookings-single-view";
import {
  type PageProps as ClientPageProps,
  getServerSideProps,
} from "~/bookings/views/bookings-single-view.getServerSideProps";

const getEmbedData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getEmbedData(context);

  const eventLocale = props.eventType?.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <OldPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <OldPage {...props} />;
};

export default ServerPage;
