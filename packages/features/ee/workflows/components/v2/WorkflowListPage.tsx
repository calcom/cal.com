import Link from "next/link";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import showToast from "@calcom/lib/notification";
import { EventType, Workflow, WorkflowsOnEventTypes, WorkflowTriggerEvents } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Button, Tooltip } from "@calcom/ui";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Dialog } from "@calcom/ui/Dialog";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import EmptyScreen from "@calcom/ui/EmptyScreen";
import { Icon } from "@calcom/ui/Icon";
import { Badge } from "@calcom/ui/v2";

import { DeleteDialog } from "./DeleteDialog";

const CreateEmptyWorkflowView = () => {
  const { t } = useLocale();

  return (
    <EmptyScreen
      Icon={Icon.FiZap}
      headline={t("new_workflow_heading")}
      description={t("new_workflow_description")}
    />
  );
};

interface Props {
  workflows:
    | (Workflow & {
        activeOn: (WorkflowsOnEventTypes & { eventType: EventType })[];
      })[]
    | undefined;
}
export default function WorkflowListPage({ workflows }: Props) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDeleteId, setwWorkflowToDeleteId] = useState(0);

  const query = trpc.useQuery(["viewer.workflows.list"]);

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
                          {workflow.name}
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
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            color="minimal"
                            size="icon"
                            StartIcon={Icon.FiMoreHorizontal}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
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
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Button
                              onClick={() => {
                                setDeleteDialogOpen(true);
                                setwWorkflowToDeleteId(workflow.id);
                              }}
                              color="warn"
                              size="sm"
                              StartIcon={Icon.FiTrash}
                              className="w-full rounded-none">
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
