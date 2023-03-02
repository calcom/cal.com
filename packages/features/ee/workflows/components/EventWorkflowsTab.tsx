import { WorkflowActions } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, showToast, Switch, Tooltip } from "@calcom/ui";
import { FiExternalLink, FiZap } from "@calcom/ui/components/icon";

import LicenseRequired from "../../common/components/v2/LicenseRequired";
import { getActionIcon } from "../lib/getActionIcon";
import SkeletonLoader from "./SkeletonLoaderEventWorkflowsTab";
import type { WorkflowType } from "./WorkflowListPage";

type ItemProps = {
  workflow: WorkflowType;
  eventType: {
    id: number;
    title: string;
  };
};

const WorkflowListItem = (props: ItemProps) => {
  const { workflow, eventType } = props;
  const { t } = useLocale();

  const [activeEventTypeIds, setActiveEventTypeIds] = useState(
    workflow.activeOn.map((active) => {
      if (active.eventType) {
        return active.eventType.id;
      }
    })
  );

  const isActive = activeEventTypeIds.includes(eventType.id);

  const activateEventTypeMutation = trpc.viewer.workflows.activateEventType.useMutation({
    onSuccess: async () => {
      let offOn = "";
      if (activeEventTypeIds.includes(eventType.id)) {
        const newActiveEventTypeIds = activeEventTypeIds.filter((id) => {
          return id !== eventType.id;
        });
        setActiveEventTypeIds(newActiveEventTypeIds);
        offOn = "off";
      } else {
        const newActiveEventTypeIds = activeEventTypeIds;
        newActiveEventTypeIds.push(eventType.id);
        setActiveEventTypeIds(newActiveEventTypeIds);
        offOn = "on";
      }
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
        // TODO: Add missing translation
        const message = `${err.data.code}: You are not authorized to enable or disable this workflow`;
        showToast(message, "error");
      }
    },
  });

  const sendTo: Set<string> = new Set();

  workflow.steps.forEach((step) => {
    switch (step.action) {
      case WorkflowActions.EMAIL_HOST:
        sendTo.add(t("organizer_name_variable"));
        break;
      case WorkflowActions.EMAIL_ATTENDEE:
        sendTo.add(t("attendee_name_variable"));
        break;
      case WorkflowActions.SMS_ATTENDEE:
        sendTo.add(t("attendee_name_variable"));
        break;
      case WorkflowActions.SMS_NUMBER:
        sendTo.add(step.sendTo || "");
        break;
      case WorkflowActions.EMAIL_ADDRESS:
        sendTo.add(step.sendTo || "");
        break;
    }
  });

  return (
    <div className="flex w-full items-center overflow-hidden rounded-md border border-gray-200 p-6 px-3 md:p-6">
      <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-medium">
        {getActionIcon(
          workflow.steps,
          isActive ? "h-6 w-6 stroke-[1.5px] text-gray-700" : "h-6 w-6 stroke-[1.5px] text-gray-400"
        )}
      </div>
      <div className=" grow">
        <div
          className={classNames(
            "mb-1 w-full truncate text-base font-medium leading-4 text-gray-900 md:max-w-max",
            workflow.name && isActive ? "text-gray-900" : "text-gray-500"
          )}>
          {workflow.name
            ? workflow.name
            : "Untitled (" +
              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.charAt(0).toUpperCase() +
              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1) +
              ")"}
        </div>
        <div
          className={classNames(
            " flex w-fit items-center whitespace-nowrap rounded-sm text-sm leading-4",
            isActive ? "text-gray-600" : "text-gray-400"
          )}>
          <span className="mr-1">{t("to")}:</span>
          {Array.from(sendTo).map((sendToPerson, index) => {
            return <span key={index}>{`${index ? ", " : ""}${sendToPerson}`}</span>;
          })}
        </div>
      </div>
      <div className="flex-none">
        <Link href={`/workflows/${workflow.id}`} passHref={true} target="_blank">
          <Button type="button" color="minimal" className="mr-4">
            <div className="hidden ltr:mr-2 rtl:ml-2 sm:block">{t("edit")}</div>
            <FiExternalLink className="-mt-[2px] h-4 w-4 stroke-2 text-gray-600" />
          </Button>
        </Link>
      </div>
      <Tooltip content={t("turn_off") as string}>
        <div className="ltr:mr-2 rtl:ml-2">
          <Switch
            checked={isActive}
            onCheckedChange={() => {
              activateEventTypeMutation.mutate({ workflowId: workflow.id, eventTypeId: eventType.id });
            }}
          />
        </div>
      </Tooltip>
    </div>
  );
};

type Props = {
  eventType: {
    id: number;
    title: string;
    userId: number | null;
    team: {
      id?: number;
    } | null;
  };
  workflows: WorkflowType[];
};

function EventWorkflowsTab(props: Props) {
  const { workflows, eventType } = props;
  const { t } = useLocale();
  const { data, isLoading } = trpc.viewer.workflows.list.useQuery({
    teamId: eventType.team?.id,
    userId: eventType.userId || undefined,
  });
  const router = useRouter();
  const [sortedWorkflows, setSortedWorkflows] = useState<Array<WorkflowType>>([]);

  useEffect(() => {
    if (data?.workflows) {
      const activeWorkflows = workflows.map((workflowOnEventType) => {
        return workflowOnEventType;
      });
      const disabledWorkflows = data.workflows.filter(
        (workflow) =>
          !workflows
            .map((workflow) => {
              return workflow.id;
            })
            .includes(workflow.id)
      );
      setSortedWorkflows(activeWorkflows.concat(disabledWorkflows));
    }
  }, [isLoading]);

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace("/workflows/" + workflow.id);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this workflow`;
        showToast(message, "error");
      }
    },
  });

  return (
    <LicenseRequired>
      {!isLoading ? (
        data?.workflows && data?.workflows.length > 0 ? (
          <div className="space-y-4">
            {sortedWorkflows.map((workflow) => {
              return <WorkflowListItem key={workflow.id} workflow={workflow} eventType={props.eventType} />;
            })}
          </div>
        ) : (
          <div className="pt-4 before:border-0">
            <EmptyScreen
              Icon={FiZap}
              headline={t("workflows")}
              description={t("no_workflows_description")}
              buttonRaw={
                <Button
                  target="_blank"
                  color="secondary"
                  onClick={() => createMutation.mutate({ teamId: eventType.team?.id })}
                  loading={createMutation.isLoading}>
                  {t("create_workflow")}
                </Button>
              }
            />
          </div>
        )
      ) : (
        <SkeletonLoader />
      )}
    </LicenseRequired>
  );
}

export default EventWorkflowsTab;
