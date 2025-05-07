import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/payment-status-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_onboarding_status"),
    (t) => t("organization_onboarding_status_description"),
    undefined,
    undefined,
    "/settings/organizations/new/status"
  );

const getData = withAppDirSsr(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(await headers(), await cookies(), await params, await searchParams));
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
