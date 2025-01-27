import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@lib/apps/installation/[[...step]]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import Page from "~/apps/installation/[[...step]]/step-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const { appMetadata } = await getData(legacyCtx);
  return await _generateMetadata(
    (t) => `${t("install")} ${appMetadata?.name ?? ""}`,
    () => ""
  );
};

const getData = withAppDirSsr<OnboardingPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <Page {...props} />;
};
export default ServerPage;
