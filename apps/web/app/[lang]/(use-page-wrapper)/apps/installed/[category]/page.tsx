import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";

import InstalledApps from "~/apps/installed/[category]/installed-category-view";

const querySchema = z.object({
  category: z.nativeEnum(AppCategories),
});

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("installed_apps"), t("manage_your_connected_apps"));
};

const InstalledAppsWrapper = async ({ params }: PageProps) => {
  const parsedParams = querySchema.safeParse(params);

  if (!parsedParams.success) {
    redirect("/apps/installed/calendar");
  }

  return <InstalledApps category={parsedParams.data.category} />;
};

export default InstalledAppsWrapper;
