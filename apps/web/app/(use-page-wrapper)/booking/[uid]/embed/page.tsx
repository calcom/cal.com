import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import OldPage from "~/bookings/views/bookings-single-view";
import {
  getServerSideProps,
  type PageProps as ClientPageProps,
} from "~/bookings/views/bookings-single-view.getServerSideProps";

const getEmbedData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getEmbedData(context);
  return <OldPage {...props} />;
};

export default ServerPage;
