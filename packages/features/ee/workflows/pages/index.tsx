"use client";

import { useRouter } from "next/navigation";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { CreateButtonWithTeamsList } from "@calcom/features/ee/teams/components/createButton/CreateButtonWithTeamsList";
import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import EmptyScreen from "../components/EmptyScreen";
import WorkflowList from "../components/WorkflowListPage";

type PageProps = {
  hasValidLicense: boolean;
  initialData: RouterOutputs["viewer"]["workflows"]["filteredList"];
};

function WorkflowsPage({ initialData, hasValidLicense }: PageProps) {
  const { t } = useLocale();

  const filteredWorkflows = initialData;
  const router = useRouter();
  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: ({ workflow }) => {
      router.replace(`/workflows/${workflow.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_workflow_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

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
                createFunction={(teamId?: number) => {
                  createMutation.mutate({ teamId });
                }}
                isPending={createMutation.isPending}
                disableMobileButton={true}
                onlyShowWithNoTeams={true}
                includeOrg={true}
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
                    createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
                    isPending={createMutation.isPending}
                    disableMobileButton={true}
                    onlyShowWithTeams={true}
                    includeOrg={true}
                  />
                </div>
              </div>
            ) : null}
            <FilterResults
              queryRes={{ isPending: false, data: filteredWorkflows }}
              emptyScreen={<EmptyScreen isFilteredView={false} />}
              noResultsScreen={<EmptyScreen isFilteredView={true} />}
              SkeletonLoader={() => null}>
              <WorkflowList workflows={filteredWorkflows?.filtered} />
            </FilterResults>
          </>
        </ShellMain>
      </LicenseRequired>
    </Shell>
  );
}

export default WorkflowsPage;
