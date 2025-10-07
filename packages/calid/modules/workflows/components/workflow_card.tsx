"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch/switch";
import React, { useCallback, useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";

import type { CalIdWorkflowType } from "../config/types";
import {
  generateTriggerText,
  generateEventTypeInfo,
  generateActionText,
  generateWorkflowTitle,
} from "../config/utils";

interface WorkflowCardProps {
  workflow: CalIdWorkflowType;
  onEdit: (workflowId: number) => void;
  onToggle: (workflowId: number, enabled: boolean) => void;
  onDuplicate: (workflowId: number) => void;
  onDelete: (workflowId: number) => void;
}
export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}) => {
  const { t } = useLocale();

  const handleCardClick = useCallback(() => {
    onEdit(workflow.id);
  }, [onEdit, workflow.id]);

  const triggerText = useMemo(
    () => generateTriggerText(workflow, t),
    [workflow.trigger, workflow.time, workflow.timeUnit, t]
  );

  const eventTypeInfo = useMemo(() => generateEventTypeInfo(workflow, t), [workflow, t]);

  const actionText = useMemo(() => generateActionText(workflow), [workflow.steps]);

  const workflowTitle = useMemo(() => generateWorkflowTitle(workflow, t), [workflow.name, workflow.steps, t]);

  return (
    <div
      className="bg-card border-default cursor-pointer rounded-md border px-3 py-5 transition-all hover:shadow-md"
      onClick={handleCardClick}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span
                className={classNames(
                  "text-default text-sm font-medium",
                  workflow.name ? "text-foreground" : "text-muted-foreground"
                )}>
                {workflowTitle}
              </span>
              {workflow.readOnly && (
                <Badge variant="secondary" className="ml-2">
                  {t("readonly")}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={!workflow.disabled}
                  onCheckedChange={(enabled) => onToggle(workflow.id, enabled)}
                  disabled={workflow.readOnly}
                />
              </div>

              {!workflow.readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button color="secondary" variant="icon" onClick={(e) => e.stopPropagation()}>
                      <Icon name="ellipsis" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                    className="border-default bg-default border shadow-lg backdrop-blur-none">
                    <DropdownMenuItem StartIcon="pencil-line" onClick={() => onEdit(workflow.id)}>
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem StartIcon="copy" onClick={() => onDuplicate(workflow.id)}>
                      {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      StartIcon="trash-2"
                      onClick={() => onDelete(workflow.id)}
                      className="text-destructive hover:bg-error">
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <p className="text-subtle mb-2 text-sm">{triggerText}</p>

          <div className="flex items-center justify-start space-x-2">
            <Badge variant="secondary" className="inline-flex items-center" startIcon="link">
              {eventTypeInfo}
            </Badge>
            <Badge variant="secondary" className="inline-flex items-center" startIcon="check">
              {actionText}
            </Badge>
            {workflow.calIdTeam?.name && (
              <Badge variant="secondary" className="inline-flex items-center">
                <Avatar alt={workflow.calIdTeam.name} size="xs" className="mr-1" />
                {workflow.calIdTeam.name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
