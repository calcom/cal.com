import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@lib/apps/installation/[[...step]]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import Page from "~/apps/installation/[[...step]]/step-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_installation"),
    () => ""
  );
};

const getData = withAppDirSsr<OnboardingPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  return <Page {...props} />;
};
export default ServerPage;
