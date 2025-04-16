import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/settings/license-key/new/getServerSideProps";

import CreateANewLicenseKeyForm, { LayoutWrapper } from "~/settings/license-key/new/new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_organization"),
    (t) => t("organizations_description"),
    undefined,
    undefined,
    "/settings/license-key/new"
  );

const getData = withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  await getData(buildLegacyCtx(await headers(), await cookies(), await params, await searchParams));
  return (
    <LayoutWrapper>
      <CreateANewLicenseKeyForm />
    </LayoutWrapper>
  );
};

export default ServerPage;
