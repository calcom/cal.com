import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/claim-pro/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/claim-pro/claim-pro-view";
import Page from "~/claim-pro/claim-pro-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Claim Pro",
    () => "Claim Cal ID's pro version for the next 2 years for free",
    undefined,
    undefined,
    "/claim"
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  const props = await getData(context);
  if ((props.userMetadata as any).isProUser?.yearClaimed === 2) {
    redirect("/home");
  }
  return (
    <Shell heading="Claim Pro" subtitle="Claim Cal ID's pro version for the next 2 years for free">
      <Page {...props} />
    </Shell>
  );
};
export default ServerPage;
