"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import Link from "next/link";
import React, { useState, useMemo, useCallback } from "react";

import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { templates, WorkflowTemplate } from "../config/workflow_templates";
import { useWorkflowMutations } from "../hooks/useWorkflowsMutations";

type WorkflowBuilderTemplatesProps = {
  templates: typeof templates;
  teamId: number;
};

export const WorkflowBuilderTemplates = ({ templates, teamId }: WorkflowBuilderTemplatesProps) => {
  const { t, i18n } = useLocale();

  const routerQuery = useRouterQuery();

  const filters = useMemo(() => getTeamsFiltersFromQuery(routerQuery), [routerQuery]);

  const { mutations, handlers } = useWorkflowMutations(filters);

  const handleWorkflowCreate = useCallback(
    (builderTemplate?: WorkflowTemplate) => {
      const _teamId =
        typeof teamId === "number"
          ? teamId
          : typeof teamId === "string"
          ? teamId === ""
            ? null
            : parseInt(teamId, 10)
          : null;
      console.log("Team id is: ", _teamId);
      handlers.handleCreateWorkflow(_teamId, builderTemplate);
    },
    [handlers]
  );

  const getIcon = (actionType: WorkflowActions) => {
    switch (actionType) {
      case WorkflowActions.EMAIL_ATTENDEE:
      case WorkflowActions.EMAIL_HOST:
        return "mail";
      case WorkflowActions.SMS_ATTENDEE:
        return "message-square";
      case WorkflowActions.WHATSAPP_ATTENDEE:
        return "message-square";
        // return "message-circle";
      default:
        return "workflow";
    }
  };

  const iconColor = (actionType: WorkflowActions) => {
    switch (actionType) {
      case WorkflowActions.EMAIL_ATTENDEE:
      case WorkflowActions.EMAIL_HOST:
        return "green";
      case WorkflowActions.SMS_ATTENDEE:
        return "orange";
      case WorkflowActions.WHATSAPP_ATTENDEE:
        return "orange";
      default:
        return "blue";
    }
  };

  return (
    <Shell withoutMain backPath="/workflows">
      <ShellMain
        backPath="/workflows"
        heading={t("workflows")}
        subtitle={t("workflows_to_automate_notifications")}>
        <div className="mx-auto justify-center text-center">
          <div className="flex w-full flex-row">
            <div className="flex-1" />
            <div className="flex-1" />
            <Button
              onClick={() => {
                handleWorkflowCreate(null);
              }}
              className="my-6 flex-1 items-center justify-center md:hidden"
              StartIcon="plus"
              variant="button"
              color="primary">
              {t("add_custom")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 ">
            {templates.map((template: WorkflowTemplate) => (
              <div
                key={template.id}
                className="border-border bg-card flex flex-col items-center justify-center rounded-lg border p-4 hover:shadow-md">
                <div className="bg-muted h-10 w-10 rounded-md">
                  <Icon
                    name={getIcon(template.actionType)}
                    style={{ color: iconColor(template.actionType) }}
                    className={`h-10 w-10 p-2`}
                  />
                </div>
                <h3 className="mb-2 text-center text-md font-medium">{template.name}</h3>
                <p className="text-subtle text-center text-sm font-normal">{template.description}</p>
                <Button
                  onClick={() => {
                    handleWorkflowCreate(template);
                  }}
                  className="mt-4"
                  variant="button"
                  color="secondary">
                  {t("use_template")}
                </Button>
              </div>
            ))}
          </div>
          <div className="w-full text-center">
            <div className="flex-1" />
            <Button
              onClick={() => handleWorkflowCreate(null)}
              className="mx-auto px-12 text-sm mt-10 hidden items-center justify-center md:flex"
              StartIcon="plus"
              variant="button"
              color="primary">
              {t("add_custom")}
            </Button>
          </div>
        </div>
      </ShellMain>
    </Shell>
  );
};
