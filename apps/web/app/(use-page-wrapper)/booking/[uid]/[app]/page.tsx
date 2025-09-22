// apps/web/app/booking/[uid]/[app]/page.tsx
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PaymentAppCBView from "~/bookings/views/booking-app-cb-view";
import {
  getServerSideProps,
  type PageProps as ClientPageProps,
} from "~/bookings/views/booking-app-cb.getServerSideProps";

export const generateMetadata = async ({ params, searchParams }: _PageProps): Promise<Metadata> => {
  // For this payment callback page, you might want to keep it simple
  return await _generateMetadata(
    (t) => t("Payment Callback"),
    (t) => t("Handles payment callbacks securely"),
    true, // noindex
    getOrgFullOrigin(null), // no org for payment callbacks typically
    `/booking/${(await params).uid}/${(await params).app}`
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  // Since this is a payment callback page, you probably don't need custom locale handling
  // But if you do, you can add it here similar to the example
  return <PaymentAppCBView {...props} />;
};

export default ServerPage;
