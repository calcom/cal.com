import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import SetupView, { type PageProps as ClientPageProps } from "~/apps/[slug]/setup/setup-view";

export const generateMetadata = async ({ params }: ServerPageProps) => {
  const metadata = await _generateMetadata(
    () => `${params.slug}`,
    () => ""
  );
  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  };
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const { dehydratedState, ...props } = await getData(context);
  return <SetupView {...props} />;
};

export default ServerPage;
