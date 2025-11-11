import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/workflows/pages/index";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { getCachedWorkflowsFilteredList } from "@lib/cache/workflows";

import { revalidateWorkflowsListAction } from "./actions";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications"),
    undefined,
    undefined,
    "/workflows"
  );

type PageSearchParams = Record<string, string | string[] | undefined>;

const Page = async ({ searchParams }: { searchParams: PageSearchParams }) => {
  const req = buildLegacyRequest(headers(), cookies());
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const filters = getTeamsFiltersFromQuery(searchParams);
  const hasValidLicense = Boolean(session?.hasValidLicense);
  const initialData = await getCachedWorkflowsFilteredList(session.user.id, filters);

  return (
    <LegacyPage
      initialData={initialData}
      hasValidLicense={hasValidLicense}
      onRevalidate={revalidateWorkflowsListAction}
    />
  );
};

export default Page;
