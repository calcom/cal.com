import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { ServerTeamsListing } from "./server-page";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative"),
    undefined,
    undefined,
    "/teams"
  );

const ServerPage = async ({ searchParams: _searchParams }: ServerPageProps) => {
  const req = {
    headers: (await headers()) as any,
    cookies: (await cookies()) as any,
  } as any;
  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });
  const searchParams = await _searchParams;
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;

  if (!session) {
    redirect(callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login");
  }

  const t = await getTranslate();
  const { Main, CTA } = await ServerTeamsListing({ searchParams, session });

  return (
    <ShellMainAppDir CTA={CTA} heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      {Main}
    </ShellMainAppDir>
  );
};
export default ServerPage;
