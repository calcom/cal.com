import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

// import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
// import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
// import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import LegacyPage from "@calcom/features/ee/workflows/pages/index";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

const Page = async ({ params, searchParams }: PageProps) => {
  // FIXME: Refactor me once next-auth endpoint is migrated to App Router
  // const session = await getServerSessionForAppDir();
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

export default WithLayout({ getLayout: null, ServerPage: Page })<"P">;
