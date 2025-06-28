import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getSession } from "next-auth/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import LegacyPage from "@calcom/features/ee/workflows/pages/index";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { workflowsRouter } from "@calcom/trpc/server/routers/viewer/workflows/_router";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications"),
    undefined,
    undefined,
    "/workflows"
  );

const Page = async ({ params, searchParams }: PageProps) => {
  const _searchParams = await searchParams;
  const context = buildLegacyCtx(await headers(), await cookies(), await params, _searchParams);
  const session = await getSession(context);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const filters = getTeamsFiltersFromQuery(_searchParams);

  const hasValidLicense = session?.hasValidLicense ?? false;
  const caller = await createRouterCaller(workflowsRouter);

  const initialData = await caller.filteredList({ filters });

  return <LegacyPage initialData={initialData} hasValidLicense={hasValidLicense} />;
};

export default Page;
