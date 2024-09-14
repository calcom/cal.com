import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { AppRepository } from "@calcom/lib/server/repository/app";
import { AppCategories } from "@calcom/prisma/enums";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description")
  );

const querySchema = z.object({
  category: z.nativeEnum(AppCategories).optional().default(AppCategories.calendar),
});

const Page = async ({ params, searchParams }: PageProps) => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");
  const { category } = querySchema.parse({ ...params, ...searchParams });

  try {
    const appsList = await AppRepository.getAppsList({ input: { category } });

    return (
      <SettingsHeader title={t("apps")} description={t("admin_apps_description")}>
        <div className="flex">
          <AdminAppsList
            baseURL="/settings/admin/apps"
            classNames={{
              appCategoryNavigationRoot: "overflow-x-scroll",
            }}
            ssrProps={{
              appsList,
            }}
          />
        </div>
      </SettingsHeader>
    );
  } catch (e) {
    notFound();
  }
};

export default Page;
