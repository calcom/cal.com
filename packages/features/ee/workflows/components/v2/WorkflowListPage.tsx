import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import showToast from "@calcom/lib/notification";
import { EventType, Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Tooltip } from "@calcom/ui";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import { Badge, Button } from "@calcom/ui/v2";

import { DeleteDialog } from "./DeleteDialog";
import EmptyScreen from "./EmptyScreen";

const CreateEmptyWorkflowView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const createMutation = trpc.useMutation("viewer.workflows.createV2", {
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
    <EmptyScreen
      buttonText={t("create_workflow")}
      buttonOnClick={() => createMutation.mutate()}
      IconHeading={Icon.FiZap}
      headline={t("workflows")}
      description={t("no_workflows_description")}
      isLoading={createMutation.isLoading}
    />
  );
};

interface Props {
  workflows:
    | (Workflow & {
        steps: WorkflowStep[];
        activeOn: (WorkflowsOnEventTypes & {
          eventType: EventType;
        })[];
      })[]
    | undefined;
}
export default function WorkflowListPage({ workflows }: Props) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDeleteId, setwWorkflowToDeleteId] = useState(0);
  const router = useRouter();

  return (
    <>
      {workflows && workflows.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white sm:mx-0">
          <ul className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <li key={workflow.id}>
                <div className="first-line:group flex w-full items-center justify-between p-4 hover:bg-neutral-50 sm:px-6">
                  <Link href={"/workflows/" + workflow.id}>
                    <a className="flex-grow cursor-pointer">
                      <div className="rtl:space-x-reverse">
                        <div className="max-w-56 truncate text-sm font-medium leading-6 text-gray-900 md:max-w-max">
                          {workflow.name
                            ? workflow.name
                            : `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`
                                .charAt(0)
                                .toUpperCase() +
                              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1)}
                        </div>
                        <ul className="flex flex-wrap text-sm sm:flex-nowrap">
                          <li className=" mr-4 flex min-w-[265px] items-center truncate whitespace-nowrap">
                            <Badge variant="gray" size="lg" StartIcon={Icon.FiZap}>
                              <span className="mr-1">{t("triggers")}</span>
                              {workflow.timeUnit && workflow.time && (
                                <span className="mr-1">
                                  {t(`${workflow.timeUnit.toLowerCase()}`, { count: workflow.time })}
                                </span>
                              )}
                              <span>{t(`${workflow.trigger.toLowerCase()}_trigger`)}</span>
                            </Badge>
                          </li>
                          <li className="flex min-w-[11rem] items-center whitespace-nowrap">
                            {workflow.activeOn && workflow.activeOn.length > 0 ? (
                              <Tooltip
                                content={workflow.activeOn.map((activeOn, key) => (
                                  <p key={key}>{activeOn.eventType.title}</p>
                                ))}>
                                <Badge variant="gray" size="lg" StartIcon={Icon.FiLink}>
                                  {t("active_on_event_types", { count: workflow.activeOn.length })}
                                </Badge>
                              </Tooltip>
                            ) : (
                              <Badge variant="gray" size="lg" StartIcon={Icon.FiLink}>
                                {t("no_active_event_types")}
                              </Badge>
                            )}
                          </li>
                        </ul>
                      </div>
                    </a>
                  </Link>
                  <div className="flex flex-shrink-0">
                    <div className="flex justify-between space-x-2 rtl:space-x-reverse">
                      <Button
                        type="button"
                        color="secondary"
                        onClick={async () => await router.replace("/workflows/" + workflow.id)}>
                        {t("edit")}
                      </Button>
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            color="secondary"
                            size="icon"
                            StartIcon={Icon.FiMoreHorizontal}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {/* <DropdownMenuItem>
                            <Link href={"/workflows/" + workflow.id} passHref={true}>
                              <Button
                                type="button"
                                size="sm"
                                color="minimal"
                                className="w-full rounded-none"
                                StartIcon={Icon.FiEdit2}>
                                {t("edit")}
                              </Button>
                            </Link>
                          </DropdownMenuItem> */}
                          <DropdownMenuItem>
                            <Button
                              onClick={() => {
                                setDeleteDialogOpen(true);
                                setwWorkflowToDeleteId(workflow.id);
                              }}
                              color="minimal"
                              StartIcon={Icon.FiTrash2}>
                              {t("delete")}
                            </Button>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <DeleteDialog
            isOpenDialog={deleteDialogOpen}
            setIsOpenDialog={setDeleteDialogOpen}
            workflowId={workflowToDeleteId}
            additionalFunction={async () => {
              await utils.invalidateQueries(["viewer.workflows.list"]);
            }}
          />
        </div>
      ) : (
        <CreateEmptyWorkflowView />
      )}
    </>
  );
}
