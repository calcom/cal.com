import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/settings/platform/plans/getServerSideProps";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("platform")} ${t("plans")}`,
    () => "",
    undefined,
    undefined,
    "/settings/platform/plans"
  );
};

const getData = withAppDirSsr(getServerSideProps);

const ServerPageWrapper = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(await headers(), await cookies(), await params, await searchParams));
  return <PlatformPlansView />;
};

export default ServerPageWrapper;
