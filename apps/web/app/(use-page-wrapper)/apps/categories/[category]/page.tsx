import type { PageProps } from "app/_types";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";
import { runWithTenants } from "@calcom/prisma/store/prismaStore";
import { getTenantFromHost } from "@calcom/prisma/store/tenants";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import CategoryPage from "~/apps/categories/[category]/category-view";

const querySchema = z.object({
  category: z.enum(Object.values(AppCategories) as [AppCategories, ...AppCategories[]]),
});

export default async function Page({ params, searchParams }: PageProps) {
  const parsed = querySchema.safeParse({ ...(await params), ...(await searchParams) });
  if (!parsed.success) {
    redirect("/apps/categories/calendar");
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const tenant = getTenantFromHost(host);

  const props = await runWithTenants(tenant, async () => {
    return await getStaticProps(parsed.data.category);
  });

  return <CategoryPage {...props} />;
}
