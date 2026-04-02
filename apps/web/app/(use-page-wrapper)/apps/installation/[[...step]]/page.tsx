import { getServerSideProps } from "@lib/apps/installation/[[...step]]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import Page from "~/apps/installation/[[...step]]/step-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const stepParam = (await params).step;
  const step = stepParam && Array.isArray(stepParam) ? stepParam.join("/") : "";
  return await _generateMetadata(
    (t) => t("app_installation"),
    () => "",
    undefined,
    undefined,
    `/apps/installation${step ? `/${step}` : ""}`
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
