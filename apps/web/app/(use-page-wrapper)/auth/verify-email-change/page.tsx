import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/auth/verify-email-change/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/auth/verify-email-change-view";
import VerifyEmailChange from "~/auth/verify-email-change-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("verify_email_change"),
    () => ""
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <VerifyEmailChange {...props} />;
};
export default ServerPage;
