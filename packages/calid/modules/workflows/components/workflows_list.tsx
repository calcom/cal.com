"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { CalIdWorkflowType, CalIdTeamProfile, CalIdTeamFiltersState } from "../config/types";
import { WorkflowCard } from "./workflow_card";
import { TeamsFilter } from "./workflow_teams_filter";

interface WorkflowsListProps {
  workflows: CalIdWorkflowType[];
  teamProfiles: CalIdTeamProfile[];
  teamFilters: CalIdTeamFiltersState;
  setTeamFilters: React.Dispatch<React.SetStateAction<CalIdTeamFiltersState>>;
  onCreateWorkflow: () => void;
  onEdit: (workflowId: number) => void;
  onToggle: (workflowId: number, enabled: boolean) => void;
  onDuplicate: (workflowId: number) => void;
  onDelete: (workflowId: number) => void;
  onCopyLink: (workflowId: number) => void;
  copiedLink: number | null;
  isCreating: boolean;
}

export const WorkflowsList: React.FC<WorkflowsListProps> = ({
  workflows,
  teamProfiles,
  teamFilters,
  setTeamFilters,
  onCreateWorkflow,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  onCopyLink,
  copiedLink,
  isCreating,
}) => {
  const { t } = useLocale();

  return (
    <div className="w-full max-w-full space-y-4 pb-6">
      {/* Teams Filter and New Button */}
      <div className="mb-4 flex items-center justify-between">
        <TeamsFilter profiles={teamProfiles} checked={teamFilters} setChecked={setTeamFilters} />

        <Button onClick={onCreateWorkflow} loading={isCreating} disabled={isCreating}>
          <Icon name="plus" className="h-4 w-4" />
          {t("create_workflow")}
        </Button>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onEdit={onEdit}
            onToggle={onToggle}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyLink={onCopyLink}
            copiedLink={copiedLink}
          />
        ))}
      </div>
    </div>
  );
};
