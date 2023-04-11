import type { Workflow, WorkflowStep, Membership } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  Tooltip,
  Badge,
} from "@calcom/ui";
import { Edit2, Link as LinkIcon, MoreHorizontal, Trash2 } from "@calcom/ui/components/icon";

import { getActionIcon } from "../lib/getActionIcon";
import { DeleteDialog } from "./DeleteDialog";
import EmptyScreen from "./EmptyScreen";

export type WorkflowType = Workflow & {
  team: {
    id: number;
    name: string;
    members: Membership[];
    slug: string | null;
  } | null;
  steps: WorkflowStep[];
  activeOn: {
    eventType: {
      id: number;
      title: string;
    };
  }[];
  readOnly?: boolean;
};
interface Props {
  workflows: WorkflowType[] | undefined;
  profileOptions: {
    image?: string | null;
    label: string | null;
    teamId: number | null | undefined;
    slug: string | null;
  }[];
  hasNoWorkflows?: boolean;
}
export default function WorkflowListPage({ workflows, profileOptions, hasNoWorkflows }: Props) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDeleteId, setwWorkflowToDeleteId] = useState(0);
  const router = useRouter();

  return (
    <>
      {workflows && workflows.length > 0 ? (
        <div className="bg-default border-subtle overflow-hidden rounded-md border sm:mx-0">
          <ul className="divide-subtle divide-y">
            {workflows.map((workflow) => (
              <li key={workflow.id}>
                <div className="first-line:group hover:bg-muted flex w-full items-center justify-between p-4 sm:px-6">
                  <Link href={"/workflows/" + workflow.id} className="flex-grow cursor-pointer">
                    <div className="rtl:space-x-reverse">
                      <div className="flex">
                        <div
                          className={classNames(
                            "max-w-56 text-emphasis truncate text-sm font-medium leading-6 md:max-w-max",
                            workflow.name ? "text-emphasis" : "text-subtle"
                          )}>
                          {workflow.name
                            ? workflow.name
                            : workflow.steps[0]
                            ? "Untitled (" +
                              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`
                                .charAt(0)
                                .toUpperCase() +
                              `${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1) +
                              ")"
                            : "Untitled"}
                        </div>
                        <div>
                          {workflow.readOnly && (
                            <Badge variant="gray" className="ml-2 ">
                              {t("readonly")}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ul className="mt-1 flex flex-wrap space-x-2 sm:flex-nowrap ">
                        <li>
                          <Badge variant="gray">
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
                          </Badge>
                        </li>
                        <li>
                          <Badge variant="gray">
                            {workflow.activeOn && workflow.activeOn.length > 0 ? (
                              <Tooltip
                                content={workflow.activeOn.map((activeOn, key) => (
                                  <p key={key}>{activeOn.eventType.title}</p>
                                ))}>
                                <div>
                                  <LinkIcon className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                                  {t("active_on_event_types", { count: workflow.activeOn.length })}
                                </div>
                              </Tooltip>
                            ) : (
                              <div>
                                <LinkIcon className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                                {t("no_active_event_types")}
                              </div>
                            )}
                          </Badge>
                        </li>
                        {workflow.teamId && (
                          <li>
                            <Badge variant="gray">
                              <>{workflow.team?.name}</>
                            </Badge>
                          </li>
                        )}
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
                            StartIcon={Edit2}
                            disabled={workflow.readOnly}
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
                            disabled={workflow.readOnly}
                            StartIcon={Trash2}
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </div>
                    {!workflow.readOnly && (
                      <div className="block sm:hidden">
                        <Dropdown>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" color="minimal" variant="icon" StartIcon={MoreHorizontal} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <DropdownItem
                                type="button"
                                StartIcon={Edit2}
                                onClick={async () => await router.replace("/workflows/" + workflow.id)}>
                                {t("edit")}
                              </DropdownItem>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <DropdownItem
                                type="button"
                                color="destructive"
                                StartIcon={Trash2}
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
                    )}
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
        <EmptyScreen profileOptions={profileOptions} isFilteredView={!hasNoWorkflows} />
      )}
    </>
  );
}
