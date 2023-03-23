import { Workflow, WorkflowStep } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";
import { FiEdit2, FiLink, FiMoreHorizontal, FiTrash2, FiZap } from "@calcom/ui/components/icon";

import { getActionIcon } from "../lib/getActionIcon";
import { DeleteDialog } from "./DeleteDialog";
import EmptyScreen from "./EmptyScreen";

const CreateEmptyWorkflowView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const createMutation = trpc.viewer.workflows.createV2.useMutation({
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
      IconHeading={FiZap}
      headline={t("workflows")}
      description={t("no_workflows_description")}
      isLoading={createMutation.isLoading}
      showExampleWorkflows={true}
    />
  );
};

export type WorkflowType = Workflow & {
  steps: WorkflowStep[];
  activeOn: {
    eventType: {
      id: number;
      title: string;
    };
  }[];
};
interface Props {
  workflows: WorkflowType[] | undefined;
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
                  <Link href={"/workflows/" + workflow.id} className="flex-grow cursor-pointer">
                    <div className="rtl:space-x-reverse">
                      <div
                        className={classNames(
                          "max-w-56 truncate text-sm font-medium leading-6 text-gray-900 md:max-w-max",
                          workflow.name ? "text-gray-900" : "text-gray-500"
                        )}>
                        {workflow.name
                          ? workflow.name
                          : "Untitled (" +
                            `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`
                              .charAt(0)
                              .toUpperCase() +
                            `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1) +
                            ")"}
                      </div>
                      <ul className="mt-2 flex flex-wrap space-x-1 sm:flex-nowrap ">
                        <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
                          <div>
                            {getActionIcon(workflow.steps)}

                            <span className="mr-1">{t("triggers")}</span>
                            {workflow.timeUnit && workflow.time && (
                              <span className="mr-1">
                                {t(`${workflow.timeUnit.toLowerCase()}`, { count: workflow.time })}
                              </span>
                            )}
                            <span>{t(`${workflow.trigger.toLowerCase()}_trigger`)}</span>
                          </div>
                        </li>
                        <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
                          {workflow.activeOn && workflow.activeOn.length > 0 ? (
                            <Tooltip
                              content={workflow.activeOn.map((activeOn, key) => (
                                <p key={key}>{activeOn.eventType.title}</p>
                              ))}>
                              <div>
                                <FiLink className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                                {t("active_on_event_types", { count: workflow.activeOn.length })}
                              </div>
                            </Tooltip>
                          ) : (
                            <div>
                              <FiLink className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                              {t("no_active_event_types")}
                            </div>
                          )}
                        </li>
                      </ul>
                    </div>
                  </Link>
                  <div className="flex flex-shrink-0">
                    <div className="hidden sm:block">
                      <ButtonGroup combined>
                        <Tooltip content={t("edit") as string}>
                          <Button
                            type="button"
                            color="secondary"
                            variant="icon"
                            StartIcon={FiEdit2}
                            onClick={async () => await router.replace("/workflows/" + workflow.id)}
                          />
                        </Tooltip>
                        <Tooltip content={t("delete") as string}>
                          <Button
                            onClick={() => {
                              setDeleteDialogOpen(true);
                              setwWorkflowToDeleteId(workflow.id);
                            }}
                            color="secondary"
                            variant="icon"
                            StartIcon={FiTrash2}
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </div>
                    <div className="block sm:hidden">
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" color="minimal" variant="icon" StartIcon={FiMoreHorizontal} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              StartIcon={FiEdit2}
                              onClick={async () => await router.replace("/workflows/" + workflow.id)}>
                              {t("edit")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              color="destructive"
                              StartIcon={FiTrash2}
                              onClick={() => {
                                setDeleteDialogOpen(true);
                                setwWorkflowToDeleteId(workflow.id);
                              }}>
                              {t("delete")}
                            </DropdownItem>
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
              await utils.viewer.workflows.list.invalidate();
            }}
          />
        </div>
      ) : (
        <CreateEmptyWorkflowView />
      )}
    </>
  );
}
