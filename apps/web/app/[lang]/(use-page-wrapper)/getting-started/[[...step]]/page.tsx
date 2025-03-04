import { withAppDirSsr } from "app/WithAppDirSsr";
import type { MixedParams, PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/getting-started/[[...step]]/onboarding-view";
import Page from "~/getting-started/[[...step]]/onboarding-view";

export const generateMetadata = async ({
  params,
}: Omit<ServerPageProps, "params"> & { params: MixedParams }) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(`${APP_NAME} - ${t("getting_started")}`, "", true);
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({
  params,
  searchParams,
}: Omit<ServerPageProps, "params"> & { params: MixedParams }) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const props = await getData(context);
  return <Page {...props} />;
};

export default ServerPage;
