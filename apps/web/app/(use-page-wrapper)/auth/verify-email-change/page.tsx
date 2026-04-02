import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/auth/verify-email-change/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { PageProps as ClientPageProps } from "~/auth/verify-email-change-view";
import VerifyEmailChange from "~/auth/verify-email-change-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("verify_email_change"),
    () => "",
    undefined,
    undefined,
    "/auth/verify-email-change"
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  return <VerifyEmailChange {...props} />;
};
export default ServerPage;
