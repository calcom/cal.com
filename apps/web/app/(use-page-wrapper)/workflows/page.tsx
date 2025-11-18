// import { cookies, headers } from "next/headers";
// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
// import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
// import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import LegacyPage from "@calcom/features/ee/workflows/pages/index";

const Page = async () => {
  // const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
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
