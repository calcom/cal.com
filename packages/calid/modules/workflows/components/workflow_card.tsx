"use client";

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
import { Badge } from "@calcom/ui/components/badge";

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
  onCopyLink: (workflowId: number) => void;
  copiedLink: number | null;
}
export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  onCopyLink,
  copiedLink,
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
      className="bg-card border-border hover:border-border/60 cursor-pointer rounded-lg border p-4 transition-all hover:shadow-sm"
      onClick={handleCardClick}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3
                className={classNames(
                  "text-base font-semibold",
                  workflow.name ? "text-foreground" : "text-muted-foreground"
                )}>
                {workflowTitle}
              </h3>
              {workflow.readOnly && (
                <Badge variant="gray" className="ml-2">
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
                    <Button
                      color="destructive"
                      size="sm"
                      className="p-2"
                      onClick={(e) => e.stopPropagation()}>
                      <Icon name="ellipsis" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                    className="border-default bg-default border shadow-lg backdrop-blur-none">
                    <DropdownMenuItem onClick={() => onEdit(workflow.id)}>{t("edit")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(workflow.id)}>
                      {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopyLink(workflow.id)}>
                      {copiedLink === workflow.id ? t("copied") : t("copy_link")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(workflow.id)} className="text-destructive">
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <p className="text-muted-foreground mb-3 text-sm">{triggerText}</p>

          <div className="flex items-center justify-start space-x-2">
            <span className="bg-muted text-foreground inline-flex items-center rounded px-2 py-1 text-xs">
              <Icon name="link" className="mr-1 h-3 w-3" />
              {eventTypeInfo}
            </span>
            <span className="bg-muted text-foreground inline-flex items-center rounded px-2 py-1 text-xs">
              <span className="mr-1">{actionText}</span>
            </span>
            {workflow.calIdTeam?.name && (
              <Badge variant="gray" className="inline-flex items-center">
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
