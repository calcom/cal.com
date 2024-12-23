import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { BookingStatus } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import OldPage from "~/bookings/views/bookings-single-view";
import { getServerSideProps, type PageProps } from "~/bookings/views/bookings-single-view.getServerSideProps";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { bookingInfo, eventType, recurringBookings, orgSlug } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams)
  );
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;

  return await _generateMetadata(
    (t) =>
      t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    (t) =>
      t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    false,
    getOrgFullOrigin(orgSlug)
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: OldPage });
