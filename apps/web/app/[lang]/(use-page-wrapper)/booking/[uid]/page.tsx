import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { BookingStatus } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import OldPage from "~/bookings/views/bookings-single-view";
import {
  getServerSideProps,
  type PageProps as ClientPageProps,
} from "~/bookings/views/bookings-single-view.getServerSideProps";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { bookingInfo, eventType, recurringBookings, orgSlug } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams)
  );
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(
    t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    false,
    getOrgFullOrigin(orgSlug)
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(context);
  return <OldPage {...props} />;
};
export default ServerPage;
