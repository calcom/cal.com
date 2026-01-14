import SkeletonLoader from "@calid/features/modules/workflows/components/event_workflow_tab_skeleton";
import type { CalIdWorkflowType } from "@calid/features/modules/workflows/config/types";
import { getActionIcon } from "@calid/features/modules/workflows/utils/getActionicon";
import { Alert } from "@calid/features/ui/components/alert";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card/blank-card";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import type { TFunction } from "i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { WorkflowActions } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

import { FieldPermissionIndicator, useFieldPermissions } from "./hooks/useFieldPermissions";

type PartialCalIdWorkflowType = Pick<CalIdWorkflowType, "name" | "activeOn" | "steps" | "id" | "readOnly">;
type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["calid_get"]["eventType"];

export interface EventWorkflowsProps {
  eventType: EventTypeSetup;
  workflows: PartialCalIdWorkflowType[];
}

const useFieldLockProps = (
  fieldName: string,
  fieldPermissions: ReturnType<typeof useFieldPermissions>,
  t: TFunction
) => {
  const { getFieldState } = fieldPermissions;
  const fieldState = getFieldState(fieldName);

  return useMemo(
    () => ({
      disabled: fieldState.isDisabled,
      LockedIcon: (
        <FieldPermissionIndicator fieldName={fieldName} fieldPermissions={fieldPermissions} t={t} />
      ),
      isLocked: fieldState.isLocked,
    }),
    [fieldState.isDisabled, fieldState.isLocked, fieldName, fieldPermissions, t]
  );
};

const WorkflowListItem = React.memo(
  ({
    workflow,
    eventType,
    isChildrenManagedEventType,
    isActive,
    fieldPermissions,
  }: {
    workflow: PartialCalIdWorkflowType;
    eventType: EventTypeSetup;
    isChildrenManagedEventType: boolean;
    isActive: boolean;
    fieldPermissions: ReturnType<typeof useFieldPermissions>;
  }) => {
    const { t } = useLocale();
    const utils = trpc.useUtils();

    const activateEventTypeMutation = trpc.viewer.workflows.calid_activateEventType.useMutation({
      onSuccess: async () => {
        const offOn = isActive ? "off" : "on";
        revalidateEventTypeEditPage(eventType.id);
        await utils.viewer.workflows.calid_getAllActiveWorkflows.invalidate();
        await utils.viewer.eventTypes.get.invalidate({ id: eventType.id });
        triggerToast(
          t("workflow_turned_on_successfully", {
            workflowName: workflow.name,
            offOn,
          }),
          "success"
        );
      },
      onError: (err) => {
        if (err instanceof HttpError) {
          const message = `${err.statusCode}: ${err.message}`;
          triggerToast(message, "error");
        }
        if (err.data?.code === "UNAUTHORIZED") {
          triggerToast(
            t("unauthorized_workflow_error_message", {
              errorCode: err.data.code,
            }),
            "error"
          );
        }
      },
    });

    const sendToRecipients = useMemo(() => {
      const sendTo: Set<string> = new Set();

      workflow.steps.forEach((step) => {
        switch (step.action) {
          case WorkflowActions.EMAIL_HOST:
            sendTo.add(t("organizer"));
            break;
          case WorkflowActions.EMAIL_ATTENDEE:
          case WorkflowActions.SMS_ATTENDEE:
          case WorkflowActions.WHATSAPP_ATTENDEE:
            sendTo.add(t("attendee_name_variable"));
            break;
          case WorkflowActions.SMS_NUMBER:
          case WorkflowActions.WHATSAPP_NUMBER:
          case WorkflowActions.EMAIL_ADDRESS:
            sendTo.add(step.sendTo || "");
            break;
        }
      });

      return Array.from(sendTo);
    }, [workflow.steps, t]);

    // Workflow display name with fallback
    const workflowDisplayName = useMemo(() => {
      if (workflow.name) return workflow.name;

      const firstActionName = t(`${workflow.steps[0].action.toLowerCase()}_action`);
      return `Untitled (${firstActionName.charAt(0).toUpperCase()}${firstActionName.slice(1)})`;
    }, [workflow.name, workflow.steps, t]);

    const handleToggle = useCallback(() => {
      activateEventTypeMutation.mutate({
        workflowId: workflow.id,
        eventTypeId: eventType.id,
      });
    }, [workflow.id, eventType.id, activateEventTypeMutation]);

    return (
      <div
        className="border-border w-full overflow-hidden rounded-md border p-6 px-3 md:p-6"
        style={
          isActive
            ? {
                borderColor: "rgba(0, 140, 68, 0.3)",
                backgroundColor: "rgba(0, 140, 68, 0.05)",
              }
            : {}
        }>
        <div className="flex items-center">
          <div
            className={classNames(
              "mr-4 flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium",
              isActive ? "bg-default" : "bg-muted"
            )}>
            {getActionIcon(
              workflow.steps,
              isActive ? "h-6 w-6 stroke-[1.5px] text-green-600" : "h-6 w-6 stroke-[1.5px] text-muted"
            )}
          </div>

          <div className="grow">
            <div
              className={classNames(
                "text-emphasis mb-1 w-full truncate text-base font-medium leading-4 md:max-w-max",
                isActive ? "text-emphasis" : "text-subtle"
              )}>
              {workflowDisplayName}
            </div>
            <div
              className={classNames(
                "flex w-fit items-center whitespace-nowrap rounded-sm text-sm leading-4",
                isActive ? "text-default" : "text-muted"
              )}>
              {/* TODO */}
              {/* <span className="mr-1">{t("to")}:</span>
              {sendToRecipients.map((recipient, index) => (
                <span key={index}>{`${index ? ", " : ""}${recipient}`}</span>
              ))} */}
            </div>
          </div>

          <Tooltip
            content={
              isChildrenManagedEventType && fieldPermissions.isFieldLocked("workflows")
                ? t("locked_by_team_admins")
                : isActive
                ? t("turn_off")
                : t("turn_on")
            }>
            <div className="flex items-center ltr:mr-2 rtl:ml-2">
              {isChildrenManagedEventType && fieldPermissions.isFieldLocked("workflows") && (
                <Icon name="lock" className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
              )}
              <Switch
                checked={isActive}
                disabled={isChildrenManagedEventType && fieldPermissions.isFieldLocked("workflows")}
                onCheckedChange={handleToggle}
              />
            </div>
          </Tooltip>

          {!workflow.readOnly && (
            <div className="flex-none">
              <Link href={`/workflows/${workflow.id}`} passHref={true} target="_blank">
                <Button color="secondary" StartIcon="pencil-line" variant="icon" tooltip={t("edit")} />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }
);

WorkflowListItem.displayName = "WorkflowListItem";

/**
 * Hook for processing and sorting workflows
 * Combines active and available workflows with proper permissions
 */
const useProcessedWorkflows = (
  data: { workflows?: CalIdWorkflowType[] } | undefined,
  workflows: PartialCalIdWorkflowType[],
  eventType: EventTypeSetup,
  isChildrenManagedEventType: boolean,
  isLocked: boolean,
  isManagedEventType: boolean,
  fieldPermissions: ReturnType<typeof useFieldPermissions>
): CalIdWorkflowType[] => {
  return useMemo(() => {
    if (!data?.workflows) return [];

    const activeWorkflows: CalIdWorkflowType[] = workflows.map((workflowOnEventType) => {
      const dataWf = data.workflows?.find((wf) => wf.id === workflowOnEventType.id);

      const isFieldUnlocked = !fieldPermissions.isFieldLocked("workflows");
      const shouldBeReadOnly = isChildrenManagedEventType && dataWf?.calIdTeamId && !isFieldUnlocked;

      return {
        ...workflowOnEventType,
        readOnly: shouldBeReadOnly || (dataWf?.readOnly ?? false),
      } as CalIdWorkflowType;
    });

    const inactiveWorkflows: CalIdWorkflowType[] = data.workflows.filter(
      (workflow) =>
        (!workflow.calIdTeamId || eventType.calIdTeamId === workflow.calIdTeamId) &&
        !workflows.some((activeWf) => activeWf.id === workflow.id)
    );

    return isLocked && !isManagedEventType ? activeWorkflows : [...activeWorkflows, ...inactiveWorkflows];
  }, [
    data?.workflows,
    workflows,
    eventType.calIdTeamId,
    isChildrenManagedEventType,
    isLocked,
    isManagedEventType,
    fieldPermissions,
  ]);
};

/**
 * Main EventWorkflows component
 * Manages workflow configuration for event types with permission handling
 */
export const EventWorkflows = ({ eventType, workflows }: EventWorkflowsProps) => {
  const { t } = useLocale();
  const router = useRouter();
  const formMethods = useFormContext<FormValues>();

  const fieldPermissions = useFieldPermissions({
    eventType,
    translate: t,
    formMethods,
  });
  const { isManagedEventType, isChildrenManagedEventType } = fieldPermissions;

  const workflowsLockProps = useFieldLockProps("workflows", fieldPermissions, t);
  const lockedText = workflowsLockProps.isLocked ? "locked" : "unlocked";

  const { data, isPending } = trpc.viewer.workflows.calid_list.useQuery({
    calIdTeamId: eventType.calIdTeamId || undefined,
    userId: !isChildrenManagedEventType ? eventType.userId || undefined : undefined,
  });

  const sortedWorkflows = useProcessedWorkflows(
    data,
    workflows,
    eventType,
    isChildrenManagedEventType,
    workflowsLockProps.isLocked,
    isManagedEventType,
    fieldPermissions
  );

  const activeWorkflowsCount = workflows.length;

  const createMutation = trpc.viewer.workflows.calid_create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace(`/workflows/${workflow.id}?eventTypeId=${eventType.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        triggerToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_workflow_unauthorized_create")}`;
        triggerToast(message, "error");
      }
    },
  });

  if (isPending) {
    return <SkeletonLoader />;
  }

  return (
    <>
      {(isManagedEventType || isChildrenManagedEventType) && (
        <Alert
          severity={workflowsLockProps.isLocked ? "neutral" : "info"}
          className="mb-2"
          title={
            <ServerTrans
              t={t}
              i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admins"}`}
            />
          }
          actions={
            <div className="flex h-full items-center">
              <FieldPermissionIndicator fieldName="workflows" fieldPermissions={fieldPermissions} t={t} />
            </div>
          }
          message={
            <ServerTrans
              t={t}
              i18nKey={`workflows_${lockedText}_${
                isManagedEventType ? "for_members" : "by_team_admins"
              }_description`}
            />
          }
        />
      )}

      {sortedWorkflows.length > 0 ? (
        <div>
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                StartIcon="plus"
                onClick={() => createMutation.mutate({ calIdTeamId: eventType.calIdTeam?.id })}>
                {t("create")}
              </Button>
            </div>

            {sortedWorkflows.map((workflow) => (
              <WorkflowListItem
                key={workflow.id}
                workflow={workflow}
                eventType={eventType}
                isChildrenManagedEventType={isChildrenManagedEventType}
                isActive={workflows.some((activeWorkflow) => activeWorkflow.id === workflow.id)}
                fieldPermissions={fieldPermissions}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-2 before:border-0">
          <BlankCard
            Icon="zap"
            headline={t("workflows")}
            description={t("no_workflows_description")}
            buttonRaw={
              <Button
                disabled={workflowsLockProps.isLocked && !isManagedEventType}
                target="_blank"
                color="primary"
                onClick={() => createMutation.mutate({ calIdTeamId: eventType.calIdTeam?.id })}
                loading={createMutation.isPending}>
                {t("create_workflow")}
              </Button>
            }
          />
        </div>
      )}
    </>
  );
};
