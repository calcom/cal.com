import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";

import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { appRouter } from "@calcom/trpc/server/routers/_app";

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
  const routerCaller = await createRouterCaller(appRouter);
  const user = await routerCaller.viewer.me.get();

  if (!user) {
    redirect("/auth/login?callbackUrl=/settings/organizations/attributes");
  }

  const isAdminOrOwner = user.organization?.isOrgAdmin ?? false;

  if (!user.organizationId || !isAdminOrOwner) {
    redirect("/");
  }

  const attributes = await routerCaller.viewer.attributes.list();

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <OrgSettingsAttributesPage initialAttributes={attributes} />
    </SettingsHeader>
  );
};

export default Page;
