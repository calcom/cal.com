import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/[id]/about-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("about_your_organization"), t("about_your_organization_description"));
};

const getData = withAppDirSsr(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
