import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import LegacyPage from "@calcom/features/ee/workflows/pages/index";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

const Page = async ({ params, searchParams }: PageProps) => {
  const session = await getServerSession(AUTH_OPTIONS);
  const user = session?.user;

  const filters = getTeamsFiltersFromQuery({ ...searchParams, ...params });

  let filteredList;
  try {
    filteredList = await WorkflowRepository.getFilteredList({
      userId: user?.id,
      input: {
        filters,
      },
    });
  } catch (err) {}

  return <LegacyPage ssrProps={{ filteredList }} />;
};

export default WithLayout({ getLayout: null, ServerPage: Page })<"P">;
