import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

import SignIn from "~/auth/signin-view";
import type { PageProps as ClientPageProps } from "~/auth/signin-view";

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const reqForSession = {
    headers: context.req.headers,
    cookies: context.req.cookies,
  } as any;
  const session = await getServerSession({ req: reqForSession });
  if (session) {
    redirect("/");
  }

  const props = await getData(context);
  return <SignIn {...props} />;
};
export default ServerPage;
