"use client";

import React, { useState, useMemo, useCallback } from "react";

import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";

import type { CalIdWorkflowsProps, CalIdTeamFiltersState } from "../config/types";
import { useWorkflowMutations } from "../hooks/useWorkflowsMutations";
import { WorkflowDeleteDialog } from "./workflow_delete_dialog";
import { WorkflowEmptyState } from "./workflow_empty_state";
import { WorkflowLoading } from "./workflow_loading_state";
import { TeamsFilter } from "./workflow_teams_filter";
import { WorkflowsList } from "./workflows_list";

export const Workflows: React.FC<CalIdWorkflowsProps> = ({ setHeaderMeta, filteredList }) => {
  const { t } = useLocale();
  const routerQuery = useRouterQuery();
  const utils = trpc.useUtils();

  // Extract filters from query
  const filters = useMemo(() => getTeamsFiltersFromQuery(routerQuery), [routerQuery]);

  // Fetch workflows data
  const { data, isPending: _isPending } = trpc.viewer.workflows.calid_filteredList.useQuery(
    { filters },
    { enabled: !filteredList }
  );

  const filteredWorkflows = filteredList ?? data;
  const isPending = filteredList ? false : _isPending;

  // Local state
  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  const [workflowDeleteDialogOpen, setWorkflowDeleteDialogOpen] = useState(false);
  const [workflowIdToDelete, setWorkflowIdToDelete] = useState(0);
  const [teamFilters, setTeamFilters] = useState<CalIdTeamFiltersState>({
    userId: null,
    calIdTeamIds: [],
  });

  // Custom hook for mutations and handlers
  const { mutations, handlers } = useWorkflowMutations(filters);

  // Get team profiles for filter
  const teamProfiles = useMemo(() => {
    return filteredWorkflows?.teams || [];
  }, [filteredWorkflows]);

  // Enhanced handlers with local state management
  const handleCopyLinkWithState = useCallback(
    (workflowId: number) => {
      handlers.handleCopyLink(workflowId, () => {
        setCopiedLink(workflowId);
        setTimeout(() => setCopiedLink(null), 2000);
      });
    },
    [handlers.handleCopyLink]
  );

  const handleWorkflowDelete = useCallback((workflowId: number) => {
    setWorkflowIdToDelete(workflowId);
    setWorkflowDeleteDialogOpen(true);
  }, []);

  // Memoized values
  const workflows = useMemo(() => filteredWorkflows?.filtered || [], [filteredWorkflows]);
  const hasWorkflows = useMemo(() => workflows.length > 0, [workflows.length]);

  // Loading state
  if (isPending) {
    return <WorkflowLoading />;
  }

  return (
    <div className="bg-background min-h-screen">
      {!hasWorkflows ? (
        // Empty state
        <div className="mx-auto max-w-full">
          {/* Teams Filter for empty state */}
          {teamProfiles.length > 0 && (
            <div className="mb-8">
              <TeamsFilter profiles={teamProfiles} checked={teamFilters} setChecked={setTeamFilters} />
            </div>
          )}

          <WorkflowEmptyState
            onCreateWorkflow={handlers.handleCreateWorkflow}
            isCreating={mutations.create.isPending}
          />
        </div>
      ) : (
        // Workflows display
        <WorkflowsList
          workflows={workflows}
          teamProfiles={teamProfiles}
          teamFilters={teamFilters}
          setTeamFilters={setTeamFilters}
          onCreateWorkflow={handlers.handleCreateWorkflow}
          onEdit={handlers.handleWorkflowEdit}
          onToggle={handlers.handleWorkflowToggle}
          onDuplicate={handlers.handleWorkflowDuplicate}
          onDelete={handleWorkflowDelete}
          onCopyLink={handleCopyLinkWithState}
          copiedLink={copiedLink}
          isCreating={mutations.create.isPending}
        />
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
