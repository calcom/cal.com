import { EventType, Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, EmptyScreen, Loader } from "@calcom/ui/v2";

import LicenseRequired from "../../../common/components/v2/LicenseRequired";

type Props = {
  eventType: {
    id: number;
  };
};

type ItemProps = {
  workflow: Workflow & {
    steps: WorkflowStep[];
    activeOn: (WorkflowsOnEventTypes & {
      eventType: EventType;
    })[];
  };
};

const WorkflowListItem = (props: ItemProps) => {
  const { workflow } = props;
  const { t } = useLocale();

  return (
    <div className="mb-4 flex w-full items-center rounded-md border border-gray-200 p-4">
      <div className="ml-4 grow">
        <div
          className={classNames(
            "w-full truncate text-sm font-medium leading-6 text-gray-900 md:max-w-max",
            workflow.name ? "text-gray-900" : "text-neutral-500"
          )}>
          {workflow.name
            ? workflow.name
            : "Untitled (" +
              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.charAt(0).toUpperCase() +
              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1) +
              ")"}
        </div>
        <div className="mt-2 mb-1 flex w-fit items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800">
          <Icon.FiZap className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
          <span className="mr-1">{t("triggers")}</span>
          {workflow.timeUnit && workflow.time && (
            <span className="mr-1">{t(`${workflow.timeUnit.toLowerCase()}`, { count: workflow.time })}</span>
          )}
          <span>{t(`${workflow.trigger.toLowerCase()}_trigger`)}</span>
        </div>
      </div>
      <div className="mr-3 flex-none">
        <Button
          color="minimal"
          href={`/workflows/${workflow.id}`}
          className="text-sm text-gray-900 hover:bg-transparent">
          {t("edit")}
          <Icon.FiExternalLink className="ml-2 -mt-[2px] h-4 w-4 stroke-2 text-gray-600" />
        </Button>
      </div>
    </div>
  );
};

function EventWorkflowsTab(props: Props) {
  const { data, isLoading } = trpc.useQuery(["viewer.workflows.list", { eventTypeId: props.eventType.id }]);

  return (
    <LicenseRequired>
      {!isLoading ? (
        data?.workflows ? (
          <div className="mt-6">
            {data.workflows.map((workflow) => {
              return <WorkflowListItem key={workflow.id} workflow={workflow} />;
            })}
          </div>
        ) : (
          <EmptyScreen Icon={Icon.FiZap} headline="" description="" />
        )
      ) : (
        <Loader />
      )}
    </LicenseRequired>
  );
}

export default EventWorkflowsTab;
