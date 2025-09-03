import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getAppManifest, getAppCategories } from "@calcom/app-store/manifest";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { AppFrontendPayload } from "@calcom/types/App";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import AppsPage from "~/apps/apps-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description"),
    undefined,
    undefined,
    "/apps"
  );
};

const ServerPage = async () => {
  const req = buildLegacyRequest(await headers(), await cookies());
  const session = await getServerSession({ req });

  // Use manifest for fast app listing without component compilation
  const [appManifest, categories] = await Promise.all([getAppManifest(), getAppCategories()]);

  let userAdminTeamsIds: number[] = [];
  if (session?.user?.id) {
    const userAdminTeams = await UserRepository.getUserAdminTeams(session.user.id);
    userAdminTeamsIds = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];
  }

  // Convert manifest entries to AppFrontendPayload format for compatibility
  const appStore: AppFrontendPayload[] = appManifest.map((app) => ({
    name: app.name,
    slug: app.slug,
    logo: app.logo,
    description: app.description,
    categories: [app.category],
    type: `${app.dirName}_other` as const,
    dirName: app.dirName,
    variant: "other" as const,
    publisher: app.email,
    url: app.website,
    email: app.email,
    isTemplate: app.isTemplate || false,
    verified: false,
    rating: 0,
    reviews: 0,
    trending: false,
    installed: true,
    isDefault: false,
    installCount: 0,
    feeType: "free" as const,
    price: 0,
  }));

  const props = {
    categories,
    appStore,
    userAdminTeams: userAdminTeamsIds,
  };

  return <AppsPage {...props} isAdmin={session?.user?.role === "ADMIN"} />;
};

export default ServerPage;
