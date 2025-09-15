import SkeletonLoader from "@calid/features/modules/workflows/components/event_workflow_tab_skeleton";
import type { CalIdWorkflowType } from "@calid/features/modules/workflows/config/types";
import { getActionIcon } from "@calid/features/modules/workflows/utils/getActionicon";
import { Alert } from "@calid/features/ui/components/alert";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card/blank-card";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@calid/features/ui/components/tooltip";
import type { TFunction } from "i18next";
import { default as get } from "lodash/get";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { WorkflowActions, SchedulingType } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

// Type definitions for better type safety
type PartialCalIdWorkflowType = Pick<CalIdWorkflowType, "name" | "activeOn" | "steps" | "id" | "readOnly">;
type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["calid_get"]["eventType"];

export interface EventWorkflowsProps {
  eventType: EventTypeSetup;
  workflows: PartialCalIdWorkflowType[];
}

interface LockedIndicatorOptions {
  simple?: boolean;
}

interface FieldLockState {
  disabled: boolean;
  LockedIcon: JSX.Element | null;
  isLocked: boolean;
}

/**
 * Hook for managing locked field states in managed event types
 * Handles field locking/unlocking and state persistence
 */
const useLockedFieldsManager = (eventType: EventTypeSetup, t: TFunction) => {
  const formMethods = useFormContext<FormValues>();
  const { setValue, getValues } = formMethods;

  const [fieldStates, setFieldStates] = useState<Record<string, boolean>>({});

  const unlockedFields = eventType.metadata?.managedEventConfig?.unlockedFields || {};
  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const isChildrenManagedEventType =
    eventType.metadata?.managedEventConfig !== undefined &&
    eventType.schedulingType !== SchedulingType.MANAGED;

  const setUnlockedFields = useCallback(
    (fieldName: string, val: boolean | undefined) => {
      const path = "metadata.managedEventConfig.unlockedFields";
      const metaUnlockedFields = getValues(path);
      if (!metaUnlockedFields) return;

      if (val === undefined) {
        delete metaUnlockedFields[fieldName as keyof typeof metaUnlockedFields];
        setValue(path, { ...metaUnlockedFields }, { shouldDirty: true });
      } else {
        setValue(path, { ...metaUnlockedFields, [fieldName]: val }, { shouldDirty: true });
      }
    },
    [getValues, setValue]
  );

  const getLockedInitState = useCallback(
    (fieldName: string): boolean => {
      let locked = isManagedEventType || isChildrenManagedEventType;

      if (fieldName.includes(".")) {
        locked = locked && get(unlockedFields, fieldName) === undefined;
      } else {
        const unlockedFieldList = getValues("metadata")?.managedEventConfig?.unlockedFields as
          | Record<string, boolean>
          | undefined;
        const fieldIsUnlocked = !!unlockedFieldList?.[fieldName];
        locked = locked && !fieldIsUnlocked;
      }
      return locked;
    },
    [isManagedEventType, isChildrenManagedEventType, unlockedFields, getValues]
  );

  return {
    fieldStates,
    setFieldStates,
    isManagedEventType,
    isChildrenManagedEventType,
    setUnlockedFields,
    getLockedInitState,
  };
};

/**
 * Component for rendering locked field indicators with toggle functionality
 * Displays lock status and allows admins to toggle field locks
 */
const LockedIndicator = ({
  isChildrenManagedEventType,
  isManagedEventType,
  fieldStates,
  setFieldStates,
  t,
  fieldName,
  setUnlockedFields,
  options = { simple: false },
}: {
  isChildrenManagedEventType: boolean;
  isManagedEventType: boolean;
  fieldStates: Record<string, boolean>;
  setFieldStates: Dispatch<SetStateAction<Record<string, boolean>>>;
  t: TFunction;
  fieldName: string;
  setUnlockedFields: (fieldName: string, val: boolean | undefined) => void;
  options?: LockedIndicatorOptions;
}) => {
  const isLocked = fieldStates[fieldName];
  const stateText = t(isLocked ? "locked" : "unlocked");
  const tooltipText = t(
    `${isLocked ? "locked" : "unlocked"}_fields_${isManagedEventType ? "admin" : "member"}_description`
  );

  const handleToggle = useCallback(
    (enabled: boolean) => {
      setFieldStates((prev) => ({ ...prev, [fieldName]: enabled }));
      setUnlockedFields(fieldName, !enabled || undefined);
    },
    [fieldName, setFieldStates, setUnlockedFields]
  );

  if (!(isManagedEventType || isChildrenManagedEventType)) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline">
          <Badge
            color={isLocked ? "gray" : "green"}
            className={classNames(
              "ml-2 transform justify-between p-1",
              isManagedEventType && !options.simple && "w-28"
            )}>
            {!options.simple && (
              <span className="inline-flex">
                <Icon name={isLocked ? "lock" : "lock-open"} className="text-subtle h-3 w-3" />
                <span className="ml-1 font-medium">{stateText}</span>
              </span>
            )}
            {isManagedEventType && (
              <Switch
                data-testid={`locked-indicator-${fieldName}`}
                onCheckedChange={handleToggle}
                checked={isLocked}
                size="sm"
              />
            )}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};

/**
 * Hook for managing field locking properties
 * Returns disabled state, lock icon, and lock status for a given field
 */
const useFieldLockProps = (
  fieldName: string,
  lockedFieldsManager: ReturnType<typeof useLockedFieldsManager>,
  t: TFunction,
  options?: LockedIndicatorOptions
): FieldLockState => {
  const {
    fieldStates,
    setFieldStates,
    isManagedEventType,
    isChildrenManagedEventType,
    setUnlockedFields,
    getLockedInitState,
  } = lockedFieldsManager;

  // Initialize field state if not exists
  useEffect(() => {
    if (typeof fieldStates[fieldName] === "undefined") {
      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: getLockedInitState(fieldName),
      }));
    }
  }, [fieldName, fieldStates, setFieldStates, getLockedInitState]);

  const LockedIcon = (
    <LockedIndicator
      isChildrenManagedEventType={isChildrenManagedEventType}
      isManagedEventType={isManagedEventType}
      fieldStates={fieldStates}
      setFieldStates={setFieldStates}
      t={t}
      fieldName={fieldName}
      setUnlockedFields={setUnlockedFields}
      options={options}
    />
  );

  return useMemo(
    () => ({
      disabled: !isManagedEventType && isChildrenManagedEventType && !fieldStates[fieldName],
      LockedIcon,
      isLocked: fieldStates[fieldName] || false,
    }),
    [isManagedEventType, isChildrenManagedEventType, fieldStates, fieldName, LockedIcon]
  );
};

/**
 * Individual workflow list item component
 * Displays workflow details, status, and toggle controls
 */
const WorkflowListItem = React.memo(
  ({
    workflow,
    eventType,
    isChildrenManagedEventType,
    isActive,
  }: {
    workflow: PartialCalIdWorkflowType;
    eventType: EventTypeSetup;
    isChildrenManagedEventType: boolean;
    isActive: boolean;
  }) => {
    const { t } = useLocale();
    const utils = trpc.useUtils();

    // Mutation for activating/deactivating workflows
    const activateEventTypeMutation = trpc.viewer.workflows.calid_activateEventType.useMutation({
      onSuccess: async () => {
        const offOn = isActive ? "off" : "on";
        revalidateEventTypeEditPage(eventType.id);
        await utils.viewer.workflows.calid_getAllActiveWorkflows.invalidate();
        await utils.viewer.eventTypes.get.invalidate({ id: eventType.id });
        showToast(
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
          showToast(message, "error");
        }
        if (err.data?.code === "UNAUTHORIZED") {
          showToast(
            t("unauthorized_workflow_error_message", {
              errorCode: err.data.code,
            }),
            "error"
          );
        }
      },
    });

    // Calculate recipients from workflow steps
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
        className="border-subtle w-full overflow-hidden rounded-md border p-6 px-3 md:p-6"
        style={
          isActive
            ? {
                borderColor: "rgba(0, 140, 68, 0.3)",
                backgroundColor: "rgba(0, 140, 68, 0.05)",
              }
            : {}
        }>
        <div className="flex items-center">
          {/* Workflow icon */}
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

          {/* Workflow details */}
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
              <span className="mr-1">{t("to")}:</span>
              {sendToRecipients.map((recipient, index) => (
                <span key={index}>{`${index ? ", " : ""}${recipient}`}</span>
              ))}
            </div>
          </div>

          {/* Edit button */}
          {!workflow.readOnly && (
            <div className="flex-none">
              <Link href={`/workflows/${workflow.id}`} passHref={true} target="_blank">
                <Button type="button" color="minimal" className="mr-4" EndIcon="external-link">
                  <div className="hidden sm:block ltr:mr-2 rtl:ml-2">{t("edit")}</div>
                </Button>
              </Link>
            </div>
          )}

          {/* Toggle switch */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center ltr:mr-2 rtl:ml-2">
                {workflow.readOnly && isChildrenManagedEventType && (
                  <Icon name="lock" className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
                )}
                <Switch checked={isActive} disabled={workflow.readOnly} onCheckedChange={handleToggle} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {workflow.readOnly && isChildrenManagedEventType
                ? t("locked_by_team_admin")
                : isActive
                ? t("turn_off")
                : t("turn_on")}
            </TooltipContent>
          </Tooltip>
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
  data: any,
  workflows: PartialCalIdWorkflowType[],
  eventType: EventTypeSetup,
  isChildrenManagedEventType: boolean,
  isLocked: boolean,
  isManagedEventType: boolean
) => {
  return useMemo(() => {
    if (!data?.workflows) return [];

    // Process active workflows with enhanced properties
    const activeWorkflows = workflows.map((workflowOnEventType) => {
      const dataWf = data.workflows.find((wf: any) => wf.id === workflowOnEventType.id);
      return {
        ...workflowOnEventType,
        readOnly: isChildrenManagedEventType && dataWf?.teamId ? true : dataWf?.readOnly ?? false,
      } as CalIdWorkflowType;
    });

    // Get available but inactive workflows
    const inactiveWorkflows = data.workflows.filter(
      (workflow: any) =>
        (!workflow.calIdTeamId || eventType.calIdTeamId === workflow.calIdTeamId) &&
        !workflows.some((activeWf) => activeWf.id === workflow.id)
    );

    // Combine workflows based on lock status
    return isLocked && !isManagedEventType ? activeWorkflows : [...activeWorkflows, ...inactiveWorkflows];
  }, [
    data?.workflows,
    workflows,
    eventType.calIdTeamId,
    isChildrenManagedEventType,
    isLocked,
    isManagedEventType,
  ]);
};

/**
 * Main EventWorkflows component
 * Manages workflow configuration for event types with permission handling
 */
export const EventWorkflows = ({ eventType, workflows }: EventWorkflowsProps) => {
  const { t } = useLocale();
  const router = useRouter();

  // Initialize locked fields manager
  const lockedFieldsManager = useLockedFieldsManager(eventType, t);
  const { isManagedEventType, isChildrenManagedEventType } = lockedFieldsManager;

  // Get workflow field lock properties
  const workflowsLockProps = useFieldLockProps("workflows", lockedFieldsManager, t, { simple: true });
  const lockedText = workflowsLockProps.isLocked ? "locked" : "unlocked";

  // Fetch available workflows
  const { data, isPending } = trpc.viewer.workflows.calid_list.useQuery({
    calIdTeamId: eventType.calIdTeamId || undefined,
    userId: !isChildrenManagedEventType ? eventType.userId || undefined : undefined,
  });

  // Process and sort workflows
  const sortedWorkflows = useProcessedWorkflows(
    data,
    workflows,
    eventType,
    isChildrenManagedEventType,
    workflowsLockProps.isLocked,
    isManagedEventType
  );

  // Calculate active workflow count
  const activeWorkflowsCount = workflows.length;

  // Mutation for creating new workflows
  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace(`/workflows/${workflow.id}?eventTypeId=${eventType.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_workflow_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  // Show loading state
  if (isPending) {
    return <SkeletonLoader />;
  }

  return (
    <>
      {/* Permission Management Alert */}
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
          message={
            <div className="flex items-center">
              <ServerTrans
                t={t}
                i18nKey={`workflows_${lockedText}_${
                  isManagedEventType ? "for_members" : "by_team_admins"
                }_description`}
              />
              <div className="ml-2 flex h-full items-center">{workflowsLockProps.LockedIcon}</div>
            </div>
          }
        />
      )}

      {/* Workflows List or Empty State */}
      {sortedWorkflows.length > 0 ? (
        <div>
          <div className="space-y-4">
            {/* Header with stats and quick actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-grey-700 text-sm font-medium">{activeWorkflowsCount} Active</span>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <a
                    href="/workflows"
                    className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-500">
                    <span>Create New Workflow</span>
                    <Icon name="external-link" className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Workflows List */}
            {sortedWorkflows.map((workflow) => (
              <WorkflowListItem
                key={workflow.id}
                workflow={workflow}
                eventType={eventType}
                isChildrenManagedEventType={isChildrenManagedEventType}
                isActive={workflows.some((activeWorkflow) => activeWorkflow.id === workflow.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
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
                onClick={() => createMutation.mutate({ teamId: eventType.calIdTeam?.id })}
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
