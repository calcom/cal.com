import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";
import { type inferSSRProps } from "@lib/types/inferSSRProps";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/create-new-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("set_up_your_organization"), t("organizations_description"));
};

const getData = withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return (
    <LayoutWrapper>
      <LicenseRequired>
        <LegacyPage />
      </LicenseRequired>
    </LayoutWrapper>
  );
};

export default ServerPage;
