import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/auth/forgot-password/[id]/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { PageProps as ClientPageProps } from "~/auth/forgot-password/[id]/forgot-password-single-view";
import SetNewUserPassword from "~/auth/forgot-password/[id]/forgot-password-single-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) => {
  return await _generateMetadata(
    (t) => t("reset_password"),
    (t) => t("change_your_password"),
    undefined,
    undefined,
    `/auth/forgot-password/${(await params).id}`
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  return <SetNewUserPassword {...props} />;
};

export default ServerPage;
