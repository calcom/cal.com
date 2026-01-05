"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon/Icon";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WorkflowActions } from "@calcom/prisma/enums";

import type { templates, WorkflowTemplate } from "../config/workflow_templates";

type TemplatesContentProps = {
  templates: typeof templates;
  onCreateWorkflow: (template?: WorkflowTemplate) => void;
};

export const TemplatesContent = ({ templates, onCreateWorkflow }: TemplatesContentProps) => {
  const { t } = useLocale();

  const getIcon = (actionType: WorkflowActions) => {
    switch (actionType) {
      case WorkflowActions.EMAIL_ATTENDEE:
      case WorkflowActions.EMAIL_HOST:
        return "mail";
      case WorkflowActions.SMS_ATTENDEE:
        return "message-square";
      case WorkflowActions.WHATSAPP_ATTENDEE:
        return "message-square";
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
    <div className="mx-auto justify-center text-center">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 ">
        {templates.map((template: WorkflowTemplate, idx: number) => (
          <div
            key={idx}
            className="border-border bg-card flex flex-col items-center justify-center rounded-lg border p-4 hover:shadow-md">
            <div className="bg-muted h-10 w-10 rounded-md">
              <Icon
                name={getIcon(template.actionType)}
                style={{ color: iconColor(template.actionType) }}
                className="h-10 w-10 p-2"
              />
            </div>
            <h3 className="text-md mb-2 text-center font-medium">{template.name}</h3>
            <p className="text-subtle text-center text-sm font-normal">{template.description}</p>
            <Button
              onClick={() => onCreateWorkflow(template)}
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
          onClick={() => onCreateWorkflow()}
          className="mx-auto mt-10 flex items-center justify-center px-12 text-sm"
          StartIcon="plus"
          variant="button"
          color="primary">
          {t("add_custom")}
        </Button>
      </div>
    </div>
  );
};
