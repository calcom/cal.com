import { _generateMetadata, getTranslate } from "app/_utils";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/organizations/pages/settings/general";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { createContextInner } from "@calcom/trpc/server/createContext";
import { appRouter } from "@calcom/trpc/server/routers/_app";

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

  const ctx = await createContextInner({ session, locale: session.user.locale ?? "en" });
  const caller = appRouter.createCaller(ctx);

  const user = await caller.viewer.me.get();
  const currentOrg = await caller.viewer.organizations.listCurrent();

  if (!currentOrg) {
    redirect("/getting-started");
  }

  const isAdminOrOwner = checkAdminOrOwner(session.user.org?.role);
  const localeProp = user?.locale ?? "en";

  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <LegacyPage currentOrg={currentOrg} isAdminOrOwner={isAdminOrOwner} localeProp={localeProp} />
    </SettingsHeader>
  );
};

export default Page;
