import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
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
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const searchParams = await _searchParams;
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const autoAccept = Array.isArray(searchParams?.autoAccept)
    ? searchParams.autoAccept[0]
    : searchParams?.autoAccept;
  const callbackUrl = token
    ? `/teams?token=${encodeURIComponent(token)}${
        autoAccept ? `&autoAccept=${encodeURIComponent(autoAccept)}` : ""
      }`
    : null;

  if (!session) {
    redirect(callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login");
  }

  const t = await getTranslate();
  const { Main, CTA, showHeader } = await ServerTeamsListing({ searchParams, session });

  return (
    <ShellMainAppDir
      CTA={showHeader ? CTA : null}
      heading={showHeader ? t("teams") : undefined}
      subtitle={showHeader ? t("create_manage_teams_collaborative") : undefined}
      flexChildrenContainer={!showHeader}>
      {Main}
    </ShellMainAppDir>
  );
};
export default ServerPage;
