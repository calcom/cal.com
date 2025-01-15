import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import CategoryPage from "~/apps/categories/[category]/category-view";

const querySchema = z.object({
  category: z.enum(Object.values(AppCategories) as [AppCategories, ...AppCategories[]]),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description")
  );
};

export const generateStaticParams = async () => {
  const paths = Object.keys(AppCategories);
  return paths.map((category) => ({ category }));
};

async function Page({ params, searchParams }: PageProps) {
  const parsed = querySchema.safeParse({ ...params, ...searchParams });
  if (!parsed.success) {
    redirect("/apps/categories/calendar");
  }

  const props = await getStaticProps(parsed.data.category);

  return <CategoryPage {...props} />;
}

export default WithLayout({ getLayout: null, ServerPage: Page });
