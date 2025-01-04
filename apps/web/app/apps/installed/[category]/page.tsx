import { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";

import InstalledApps from "~/apps/installed/[category]/installed-category-view";

const querySchema = z.object({
  category: z.nativeEnum(AppCategories),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("installed_apps"),
    (t) => t("manage_your_connected_apps")
  );
};

const InstalledAppsWrapper = async ({ params, searchParams }: PageProps) => {
  const parsedParams = querySchema.safeParse({
    category: { ...params, ...searchParams }.category,
  });

  if (!parsedParams.success) {
    redirect("/apps/installed/calendar");
  }

  return <InstalledApps category={parsedParams.data.category} />;
};

export default WithLayout({ getLayout: null, ServerPage: InstalledAppsWrapper });
