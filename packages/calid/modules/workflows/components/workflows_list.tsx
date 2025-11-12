"use client";

import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { CalIdWorkflowType } from "../config/types";
import { WorkflowCard } from "./workflow_card";

interface WorkflowsListProps {
  workflows: CalIdWorkflowType[];
  onEdit: (workflowId: number) => void;
  onToggle: (workflowId: number, enabled: boolean) => void;
  onDuplicate: (workflowId: number) => void;
  onDelete: (workflowId: number) => void;
}

export const WorkflowsList: React.FC<WorkflowsListProps> = ({
  workflows,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}) => {
  const { t } = useLocale();

  return (
    <div className="mt-6 w-full max-w-full space-y-4 pb-6">
      <h2 className="text-default font-semibold">{t("existing_workflows")}</h2>

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
          />
        ))}
      </div>
    </div>
  );
};
