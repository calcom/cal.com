import LegacyPage from "@pages/apps/installed/[category]";
import { _generateMetadata } from "_app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import { APP_NAME } from "@calcom/lib/constants";
import { AppCategories } from "@calcom/prisma/enums";

const querySchema = z.object({
  category: z.nativeEnum(AppCategories),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("installed_apps")} | ${APP_NAME}`,
    (t) => t("manage_your_connected_apps")
  );
};

const getPageProps = async ({ params }: { params: Record<string, string | string[]> }) => {
  const p = querySchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  return {
    category: p.data.category,
  };
};

export default async function Page({ params }: { params: Record<string, string | string[]> }) {
  const { category } = await getPageProps({ params });

  return <LegacyPage />;
}
