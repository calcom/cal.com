import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/[id]/onboard-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("invite_organization_admins"),
    (t) => t("invite_organization_admins_description")
  );

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
