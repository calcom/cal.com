import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";

// import { cookies, headers } from "next/headers";
// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
// import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
// import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import LegacyPage from "@calcom/features/ee/workflows/pages/index";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

const Page = async ({ params, searchParams }: PageProps) => {
  // const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  // const user = session?.user;

  // const filters = getTeamsFiltersFromQuery({ ...searchParams, ...params });

  // let filteredList;
  // try {
  //   filteredList = await WorkflowRepository.getFilteredList({
  //     userId: user?.id,
  //     input: {
  //       filters,
  //     },
  //   });
  // } catch (err) {}

  return (
    <LegacyPage
    //  filteredList={filteredList}
    />
  );
};

export default Page;
