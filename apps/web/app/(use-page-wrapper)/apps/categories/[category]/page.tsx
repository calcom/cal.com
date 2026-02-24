import type { PageProps } from "app/_types";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import CategoryPage from "~/apps/categories/[category]/category-view";

// Pre-render all known categories at build time and revalidate every hour
export const revalidate = 3600;

export async function generateStaticParams() {
  return Object.values(AppCategories).map((category) => ({ category }));
}

const querySchema = z.object({
  category: z.enum(Object.values(AppCategories) as [AppCategories, ...AppCategories[]]),
});

async function Page({ params, searchParams }: PageProps) {
  const parsed = querySchema.safeParse({ ...(await params), ...(await searchParams) });
  if (!parsed.success) {
    redirect("/apps/categories/calendar");
  }

  const props = await getStaticProps(parsed.data.category);

  return <CategoryPage {...props} />;
}

export default Page;
