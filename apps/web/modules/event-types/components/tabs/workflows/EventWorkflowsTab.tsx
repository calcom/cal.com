import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "~/ee/common/components/LicenseRequired";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { getActionIcon } from "@calcom/features/ee/workflows/lib/getActionIcon";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

import SkeletonLoader from "~/ee/workflows/components/SkeletonLoaderEventWorkflowsTab";
import type { WorkflowType } from "~/ee/workflows/components/WorkflowListPage";

type PartialWorkflowType = Pick<
  WorkflowType,
  "name" | "activeOn" | "isOrg" | "steps" | "id" | "readOnly" | "permissions"
>;

type ItemProps = {
  workflow: PartialWorkflowType;
  eventType: {
    id: number;
    title: string;
    requiresConfirmation: boolean;
  };
  isChildrenManagedEventType: boolean;
  isActive: boolean;
};

const WorkflowListItem = (props: ItemProps) => {
  const { workflow, eventType, isActive } = props;
  const { t } = useLocale();

  const utils = trpc.useUtils();

  const activateEventTypeMutation = trpc.viewer.workflows.activateEventType.useMutation({
    onSuccess: async () => {
      const offOn = isActive ? "off" : "on";
      revalidateEventTypeEditPage(eventType.id);
      await utils.viewer.workflows.getAllActiveWorkflows.invalidate();

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

  return (
    <div className="border-subtle w-full overflow-hidden rounded-md border p-6 px-3 md:p-6">
      <div className="flex items-center">
        <div className="bg-subtle mr-4 flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium">
          {getActionIcon(
            workflow.steps,
            isActive ? "h-6 w-6 stroke-[1.5px] text-default" : "h-6 w-6 stroke-[1.5px] text-muted"
          )}
        </div>
        <div className="grow">
          <div
            className={classNames(
              "text-emphasis mb-1 w-full truncate text-base font-medium leading-4 md:max-w-max",
              workflow.name && isActive ? "text-emphasis" : "text-subtle"
            )}>
            {workflow.name
              ? workflow.name
              : `Untitled (${`${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`
                  .charAt(0)
                  .toUpperCase()}${`${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1)})`}
          </div>
          <>
            <div
              className={classNames(
                "flex w-fit items-center whitespace-nowrap rounded-sm text-sm leading-4",
                isActive ? "text-default" : "text-muted"
              )}>
              <span className="mr-1">{t("to")}:</span>
              {Array.from(sendTo).map((sendToPerson, index) => {
                return <span key={index}>{`${index ? ", " : ""}${sendToPerson}`}</span>;
              })}
            </div>
          </>
        </div>
        {workflow.permissions?.canUpdate && (
          <div className="flex-none">
            <Link href={`/workflows/${workflow.id}`} passHref={true} target="_blank">
              <Button type="button" color="minimal" className="mr-4" EndIcon="external-link">
                <div className="hidden ltr:mr-2 rtl:ml-2 sm:block">{t("edit")}</div>
              </Button>
            </Link>
          </div>
        )}
        <Tooltip
          content={
            t(
              workflow.readOnly && props.isChildrenManagedEventType
                ? "locked_by_team_admin"
                : isActive
                  ? "turn_off"
                  : "turn_on"
            ) as string
          }>
          <div className="flex items-center ltr:mr-2 rtl:ml-2">
            {workflow.readOnly && props.isChildrenManagedEventType && (
              <Icon name="lock" className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
            )}
            <Switch
              checked={isActive}
              disabled={!workflow.permissions?.canUpdate}
              onCheckedChange={() => {
                activateEventTypeMutation.mutate({ workflowId: workflow.id, eventTypeId: eventType.id });
              }}
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];

type Props = {
  eventType: EventTypeSetup;
  workflows: PartialWorkflowType[];
};

function EventWorkflowsTab(props: Props) {
  const { workflows, eventType } = props;
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const workflowsDisableProps = shouldLockDisableProps("workflows", { simple: true });
  const lockedText = workflowsDisableProps.isLocked ? "locked" : "unlocked";
  const { data, isPending } = trpc.viewer.workflows.list.useQuery({
    teamId: eventType.team?.id,
    userId: !isChildrenManagedEventType ? eventType.userId || undefined : undefined,
    includeOnlyEventTypeWorkflows: true,
  });
  const router = useRouter();
  const [sortedWorkflows, setSortedWorkflows] = useState<Array<WorkflowType>>([]);

  useEffect(() => {
    if (data?.workflows) {
      const allActiveWorkflows = workflows.map((workflowOnEventType) => {
        const dataWf = data.workflows.find((wf) => wf.id === workflowOnEventType.id);
        return {
          ...workflowOnEventType,
          readOnly: isChildrenManagedEventType && dataWf?.teamId ? true : (dataWf?.readOnly ?? false),
        } as WorkflowType;
      });

      const disabledWorkflows = data.workflows.filter(
        (workflow) =>
          (!workflow.teamId || eventType.teamId === workflow.teamId) &&
          !workflows
            .map((workflow) => {
              return workflow.id;
            })
            .includes(workflow.id)
      );
      const allSortedWorkflows =
        workflowsDisableProps.isLocked && !isManagedEventType
          ? allActiveWorkflows
          : allActiveWorkflows.concat(disabledWorkflows);
      setSortedWorkflows(allSortedWorkflows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      router.replace(`/workflows/${workflow.id}?eventTypeId=${eventType.id}`);
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

  return (
    <LicenseRequired>
      {!isPending ? (
        <>
          {(isManagedEventType || isChildrenManagedEventType) && (
            <Alert
              severity={workflowsDisableProps.isLocked ? "neutral" : "info"}
              className="mb-2"
              title={
                <ServerTrans
                  t={t}
                  i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admin"}`}
                />
              }
              actions={<div className="flex h-full items-center">{workflowsDisableProps.LockedIcon}</div>}
              message={
                <ServerTrans
                  t={t}
                  i18nKey={`workflows_${lockedText}_${
                    isManagedEventType ? "for_members" : "by_team_admin"
                  }_description`}
                />
              }
            />
          )}
          {data?.workflows && sortedWorkflows.length > 0 ? (
            <div>
              <div className="stack-y-4">
                {sortedWorkflows.map((workflow) => {
                  return (
                    <WorkflowListItem
                      key={workflow.id}
                      workflow={workflow}
                      eventType={props.eventType}
                      isChildrenManagedEventType
                      isActive={!!workflows.find((activeWorkflow) => activeWorkflow.id === workflow.id)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-2 before:border-0">
              <EmptyScreen
                Icon="zap"
                headline={t("workflows")}
                description={t("no_workflows_description")}
                buttonRaw={
                  <Button
                    disabled={workflowsDisableProps.isLocked && !isManagedEventType}
                    target="_blank"
                    color="secondary"
                    onClick={() => createMutation.mutate({ teamId: eventType.team?.id })}
                    loading={createMutation.isPending}>
                    {t("create_workflow")}
                  </Button>
                }
              />
            </div>
          )}
        </>
      ) : (
        <SkeletonLoader />
      )}
    </LicenseRequired>
  );
}

export default EventWorkflowsTab;
