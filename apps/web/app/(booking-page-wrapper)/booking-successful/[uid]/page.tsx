import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import OldPage from "~/bookings/views/booking-successful-view";
import {
  getServerSideProps,
  type PageProps as ClientPageProps,
} from "~/bookings/views/booking-successful-view.getServerSideProps";

export const generateMetadata = async ({ params }: _PageProps) => {
  const { uid } = await params;
  return await _generateMetadata(
    (t) => t("booking_confirmed"),
    (t) => t("booking_confirmed"),
    false,
    undefined,
    `/booking-successful/${uid}`
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  return <OldPage {...props} />;
};
export default ServerPage;
