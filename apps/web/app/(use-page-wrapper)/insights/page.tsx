import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import InsightsPage from "~/insights/insights-view";
import { getServerSideProps, type PageProps } from "~/insights/insights-view.getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights"
  );

const getData = withAppDirSsr<PageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const pageProps = await getData(legacyCtx);

  return <InsightsPage {...pageProps} />;
};

export default ServerPage;
