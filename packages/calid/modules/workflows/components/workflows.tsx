"use client";

import { TeamSelectionDialog } from "@calid/features/modules/teams/components/TeamSelectionDialog";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import React, { useState, useMemo, useCallback } from "react";

import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";

import type { CalIdWorkflowsProps } from "../config/types";
import { useWorkflowMutations } from "../hooks/useWorkflowsMutations";
import { WorkflowDeleteDialog } from "./workflow_delete_dialog";
import { WorkflowLoading } from "./workflow_loading_state";
import { TeamsFilter } from "./workflow_teams_filter";
import { WorkflowsList } from "./workflows_list";

export const Workflows: React.FC<CalIdWorkflowsProps> = ({ setHeaderMeta, filteredList }) => {
  const { t } = useLocale();
  const routerQuery = useRouterQuery();
  const utils = trpc.useUtils();

  // Local state for UI interactions only
  const [workflowDeleteDialogOpen, setWorkflowDeleteDialogOpen] = useState(false);
  const [workflowIdToDelete, setWorkflowIdToDelete] = useState(0);
  const [teamSelectionDialogOpen, setTeamSelectionDialogOpen] = useState(false);

  // Single source of truth - extract filters from query
  const filters = useMemo(() => getTeamsFiltersFromQuery(routerQuery), [routerQuery]);

  // Fetch workflows data
  const { data, isPending: _isPending } = trpc.viewer.workflows.calid_filteredList.useQuery(
    { filters },
    { enabled: !filteredList }
  );

  const filteredWorkflows = filteredList ?? data;
  const isPending = filteredList ? false : _isPending;

  // Custom hook for mutations and handlers
  const { mutations, handlers } = useWorkflowMutations(filters);

  const handleWorkflowDelete = useCallback((workflowId: number) => {
    setWorkflowIdToDelete(workflowId);
    setWorkflowDeleteDialogOpen(true);
  }, []);

  // Team selection dialog handlers
  const handleOpenTeamSelectionDialog = useCallback(() => {
    setTeamSelectionDialogOpen(true);
  }, []);

  const handleTeamSelect = useCallback(
    (teamId: string) => {
      const numericTeamId = teamId ? parseInt(teamId, 10) : undefined;
      handlers.handleCreateWorkflow(numericTeamId);
      setTeamSelectionDialogOpen(false);
    },
    [handlers]
  );

  // Derived values
  const workflows = filteredWorkflows?.filtered || [];
  const teamProfiles = filteredWorkflows?.teams || [];
  const hasWorkflows = workflows.length > 0;

  // Loading state
  if (isPending) {
    return <WorkflowLoading />;
  }

  return (
    <div className="bg-default min-h-screen">
      {!hasWorkflows ? (
        // Empty state
        <div className="mx-auto max-w-full">
          {teamProfiles.length > 0 && (
            <div className="mb-8">
              <TeamsFilter profiles={teamProfiles} />
            </div>
          )}

          <BlankCard
            Icon="workflow"
            headline={t("workflows")}
            description={t("no_workflows_description")}
            buttonText={t("create_workflow")}
            buttonOnClick={handleOpenTeamSelectionDialog}
            buttonRaw={
              <Button
                color="primary"
                onClick={handleOpenTeamSelectionDialog}
                loading={mutations.create.isPending}>
                {t("create_workflow")}
              </Button>
            }
          />
        </div>
      ) : (
        // Workflows display
        <WorkflowsList
          workflows={workflows}
          teamProfiles={teamProfiles}
          onCreateWorkflow={handleOpenTeamSelectionDialog}
          onEdit={handlers.handleWorkflowEdit}
          onToggle={handlers.handleWorkflowToggle}
          onDuplicate={handlers.handleWorkflowDuplicate}
          onDelete={handleWorkflowDelete}
          isCreating={mutations.create.isPending}
        />
      )}

      {/* Team Selection Dialog */}
      <TeamSelectionDialog
        open={teamSelectionDialogOpen}
        openChange={setTeamSelectionDialogOpen}
        onTeamSelect={handleTeamSelect}
      />

      {/* Delete Dialog */}
      <WorkflowDeleteDialog
        isOpenDialog={workflowDeleteDialogOpen}
        setIsOpenDialog={setWorkflowDeleteDialogOpen}
        workflowId={workflowIdToDelete}
        additionalFunction={async () => {
          await utils.viewer.workflows.calid_filteredList.invalidate();
        }}
      />
    </div>
  );
};
