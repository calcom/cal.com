"use client";

import { useSession } from "next-auth/react";

import { CreateButtonWithTeamsList } from "@calcom/features/ee/teams/components/createButton/CreateButtonWithTeamsList";
import type { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";

import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import EmptyScreen from "@calcom/features/ee/workflows/components/EmptyScreen";
import SkeletonLoader from "@calcom/features/ee/workflows/components/SkeletonLoaderList";
import { WorkflowCreationDialog, useWorkflowCreation } from "@calcom/features/ee/workflows/components/WorkflowCreationDialog";
import WorkflowList from "@calcom/features/ee/workflows/components/WorkflowListPage";

type PageProps = {
  filteredList?: Awaited<ReturnType<typeof WorkflowRepository.getFilteredList>>;
};

function WorkflowsPage({ filteredList }: PageProps) {
  const { t } = useLocale();
  const session = useSession();
  const routerQuery = useRouterQuery();
  const filters = getTeamsFiltersFromQuery(routerQuery);
  const { showDialog, setShowDialog, pendingTeamId, openDialog } = useWorkflowCreation();

  const { data, isPending: _isPending } = trpc.viewer.workflows.filteredList.useQuery(
    {
      filters,
    },
    {
      enabled: !filteredList,
    }
  );
  const filteredWorkflows = filteredList ?? data;
  const isPending = filteredList ? false : _isPending;

  return (
    <Shell withoutMain>
      <LicenseRequired>
        <ShellMain
          heading={t("workflows")}
          subtitle={t("workflows_to_automate_notifications")}
          title={t("workflows")}
          description={t("workflows_to_automate_notifications")}
          CTA={
            session.data?.hasValidLicense ? (
              <CreateButtonWithTeamsList
                subtitle={t("new_workflow_subtitle").toUpperCase()}
                createFunction={openDialog}
                disableMobileButton={true}
                onlyShowWithNoTeams={true}
                includeOrg={true}
                withPermission={{
                  permission: "workflow.create",
                  fallbackRoles: ["ADMIN", "OWNER"],
                }}
              />
            ) : null
          }>
          <>
            {filteredWorkflows?.totalCount ? (
              <div className="flex mb-2">
                <TeamsFilter />
                <div className="mb-4 ml-auto">
                  <CreateButtonWithTeamsList
                    subtitle={t("new_workflow_subtitle").toUpperCase()}
                    createFunction={openDialog}
                    disableMobileButton={true}
                    onlyShowWithTeams={true}
                    includeOrg={true}
                    withPermission={{
                      permission: "workflow.create",
                      fallbackRoles: ["ADMIN", "OWNER"],
                    }}
                  />
                </div>
              </div>
            ) : null}
            <FilterResults
              queryRes={{ isPending, data: filteredWorkflows }}
              emptyScreen={<EmptyScreen isFilteredView={false} />}
              noResultsScreen={<EmptyScreen isFilteredView={true} />}
              SkeletonLoader={SkeletonLoader}>
              <WorkflowList workflows={filteredWorkflows?.filtered} />
            </FilterResults>
          </>
        </ShellMain>
        <WorkflowCreationDialog open={showDialog} onOpenChange={setShowDialog} teamId={pendingTeamId} />
      </LicenseRequired>
    </Shell>
  );
}

export default WorkflowsPage;
