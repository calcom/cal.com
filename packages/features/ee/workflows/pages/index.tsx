"use client";

import { CreateButtonWithTeamsList } from "@calcom/features/ee/teams/components/createButton/CreateButtonWithTeamsList";
import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";

import LicenseRequired from "../../common/components/LicenseRequired";
import EmptyScreen from "../components/EmptyScreen";
import { WorkflowCreationDialog, useWorkflowCreation } from "../components/WorkflowCreationDialog";
import WorkflowList from "../components/WorkflowListPage";

type PageProps = {
  hasValidLicense: boolean;
  initialData: RouterOutputs["viewer"]["workflows"]["filteredList"];
  onRevalidate?: () => Promise<void>;
};

function WorkflowsPage({ initialData, hasValidLicense, onRevalidate }: PageProps) {
  const { t } = useLocale();
  const { showDialog, setShowDialog, pendingTeamId, openDialog } = useWorkflowCreation();

  const filteredWorkflows = initialData;

  return (
    <Shell withoutMain>
      <LicenseRequired>
        <ShellMain
          heading={t("workflows")}
          subtitle={t("workflows_to_automate_notifications")}
          title={t("workflows")}
          description={t("workflows_to_automate_notifications")}
          CTA={
            hasValidLicense ? (
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
              <div className="flex">
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
              queryRes={{ isPending: false, data: filteredWorkflows }}
              emptyScreen={<EmptyScreen isFilteredView={false} />}
              noResultsScreen={<EmptyScreen isFilteredView={true} />}
              SkeletonLoader={() => null}>
              <WorkflowList workflows={filteredWorkflows?.filtered} onRevalidate={onRevalidate} />
            </FilterResults>
          </>
        </ShellMain>
        <WorkflowCreationDialog open={showDialog} onOpenChange={setShowDialog} teamId={pendingTeamId} />
      </LicenseRequired>
    </Shell>
  );
}

export default WorkflowsPage;
