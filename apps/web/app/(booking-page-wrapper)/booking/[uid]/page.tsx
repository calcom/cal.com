import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { BookingStatus } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import OldPage from "~/bookings/views/bookings-single-view";
import {
  getServerSideProps,
  type PageProps as ClientPageProps,
} from "~/bookings/views/bookings-single-view.getServerSideProps";

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { bookingInfo, eventType, recurringBookings, orgSlug } = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;

  const metadata = await _generateMetadata(
    (t) =>
      t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    (t) =>
      t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    false,
    getOrgFullOrigin(orgSlug),
    `/booking/${(await params).uid}`
  );

  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  };
};

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

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
