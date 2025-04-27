import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/organizations/pages/settings/general";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description"),
    undefined,
    undefined,
    "/settings/organizations/general"
  );

const Page = async () => {
  const req = buildLegacyRequest(await headers(), await cookies());
  const [t, session] = await Promise.all([getTranslate(), getServerSession({ req })]);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const meCaller = await createRouterCaller(meRouter);
  const orgCaller = await createRouterCaller(viewerOrganizationsRouter);

  const [user, currentOrg] = await Promise.all([meCaller.get(), orgCaller.listCurrent()]);

  if (!currentOrg) {
    redirect("/enterprise");
  }

  const isAdminOrOwner = checkAdminOrOwner(session.user.org?.role);
  const localeProp = user?.locale ?? "en";

  return <LegacyPage currentOrg={currentOrg} isAdminOrOwner={isAdminOrOwner} localeProp={localeProp} />;
};

export default Page;
