import LegacyPage from "@calid/features/modules/workflows/pages/index";
import { _generateMetadata, getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";

// import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications"),
    undefined,
    undefined,
    "/event-types"
  );
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
  const t = await getTranslate();

  return (
    <Shell heading={t("workflows")} subtitle={t("workflows_to_automate_notifications")}>
      <LegacyPage />
    </Shell>
  );
};

export default Page;
