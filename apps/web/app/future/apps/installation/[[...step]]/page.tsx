import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import Page from "~/apps/installation/[[...step]]/step-view";
import { getServerSideProps } from "~/apps/installation/[[...step]]/step-view.getServerSideProps";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const { appMetadata } = await getData(legacyCtx);
  return await _generateMetadata(
    (t) => `${t("install")} ${appMetadata?.name ?? ""}`,
    () => ""
  );
};

const getData = withAppDirSsr<OnboardingPageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page });
