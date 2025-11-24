"use client";

import type { WorkflowTemplate } from "@calid/features/modules/workflows/config/workflow_templates";
import { templates } from "@calid/features/modules/workflows/config/workflow_templates";
import React, { useState, useMemo, useCallback } from "react";

import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";

import type { CalIdWorkflowsProps } from "../config/types";
import { useWorkflowMutations } from "../hooks/useWorkflowsMutations";
import { TemplatesContent } from "./workflow_builder_templates";
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
  const { handlers } = useWorkflowMutations(filters);

  const handleWorkflowDelete = useCallback((workflowId: number) => {
    setWorkflowIdToDelete(workflowId);
    setWorkflowDeleteDialogOpen(true);
  }, []);

  const handleWorkflowCreate = useCallback(
    (builderTemplate?: WorkflowTemplate) => {
      const teamId =
        filters?.calIdTeamIds && filters.calIdTeamIds?.length > 0 ? filters.calIdTeamIds[0] : undefined;
      const _teamId =
        typeof teamId === "number"
          ? teamId
          : typeof teamId === "string"
          ? teamId === ""
            ? undefined
            : parseInt(teamId, 10)
          : undefined;
      handlers.handleCreateWorkflow(_teamId, builderTemplate);
    },
    [handlers, filters]
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

          <TemplatesContent templates={templates} onCreateWorkflow={handleWorkflowCreate} />
        </div>
      ) : (
        <div>
          {teamProfiles.length > 0 && (
            <div className="mb-8">
              <TeamsFilter profiles={teamProfiles} />
            </div>
          )}
          <TemplatesContent templates={templates} onCreateWorkflow={handleWorkflowCreate} />
          <WorkflowsList
            workflows={workflows}
            onEdit={handlers.handleWorkflowEdit}
            onToggle={handlers.handleWorkflowToggle}
            onDuplicate={handlers.handleWorkflowDuplicate}
            onDelete={handleWorkflowDelete}
          />
        </div>
      )}
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
