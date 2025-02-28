import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/settings/license-key/new/getServerSideProps";

import CreateANewLicenseKeyForm, { LayoutWrapper } from "~/settings/license-key/new/new-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("set_up_your_organization"), t("organizations_description"));
};

const getData = withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return (
    <LayoutWrapper>
      <CreateANewLicenseKeyForm />
    </LayoutWrapper>
  );
};

export default ServerPage;
