"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface WorkflowEmptyStateProps {
  onCreateWorkflow: () => void;
  isCreating: boolean;
}

export const WorkflowEmptyState: React.FC<WorkflowEmptyStateProps> = ({ onCreateWorkflow, isCreating }) => {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <Icon name="zap" className="text-muted-foreground h-8 w-8" />
      </div>

      <h1 className="mb-4 text-2xl font-semibold">{t("workflows")}</h1>
      <p className="text-muted-foreground mx-auto mb-8 max-w-2xl">
        {t("workflows_to_automate_notifications")}
      </p>

      <Button
        onClick={onCreateWorkflow}
        className="gap-2"
        color="secondary"
        loading={isCreating}
        disabled={isCreating}>
        <Icon name="plus" className="h-4 w-4" />
        {t("create_workflow")}
      </Button>
    </div>
  );
};
