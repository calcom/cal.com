import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { appRouter } from "@calcom/trpc/server/routers/_app";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { AttributesSkeleton } from "./skeleton";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attributes"),
    (t) => t("attribute_meta_description"),
    undefined,
    undefined,
    "/settings/organizations/attributes"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const isAdminOrOwner = checkAdminOrOwner(session?.user?.org?.role);

  if (!session?.user?.org?.id || !isAdminOrOwner) {
    redirect("/");
  }

  const routerCaller = await createRouterCaller(appRouter);
  const attributes = await routerCaller.viewer.attributes.list();

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <Suspense fallback={<AttributesSkeleton />}>
        <OrgSettingsAttributesPage initialAttributes={attributes} />
      </Suspense>
    </SettingsHeader>
  );
};

export default Page;
