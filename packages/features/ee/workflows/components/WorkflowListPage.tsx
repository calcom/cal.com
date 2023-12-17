import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Workflow, WorkflowStep, Membership } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { CAL_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
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
  Avatar,
  ArrowButton,
} from "@calcom/ui";
import { Edit2, Link as LinkIcon, MoreHorizontal, Trash2 } from "@calcom/ui/components/icon";

import { useOrgBranding } from "../../organizations/context/provider";
import { subdomainSuffix } from "../../organizations/lib/orgDomains";
import { getActionIcon } from "../lib/getActionIcon";
import { DeleteDialog } from "./DeleteDialog";

export type WorkflowType = Workflow & {
  team: {
    id: number;
    name: string;
    members: Membership[];
    slug: string | null;
    logo?: string | null;
  } | null;
  steps: WorkflowStep[];
  activeOn: {
    eventType: {
      id: number;
      title: string;
      parentId: number | null;
      _count: {
        children: number;
      };
    };
  }[];
  readOnly?: boolean;
};
interface Props {
  workflows: WorkflowType[] | undefined;
}
export default function WorkflowListPage({ workflows }: Props) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDeleteId, setwWorkflowToDeleteId] = useState(0);
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const router = useRouter();

  const orgBranding = useOrgBranding();
  const urlPrefix = orgBranding ? `${orgBranding.slug}.${subdomainSuffix()}` : CAL_URL;

  const mutation = trpc.viewer.workflowOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.workflows.filteredList.cancel();
      await utils.viewer.workflows.filteredList.invalidate();
    },
    onSettled: () => {
      utils.viewer.workflows.filteredList.invalidate();
    },
  });

  async function moveWorkflow(index: number, increment: 1 | -1) {
    const types = workflows!;

    const newList = [...types];

    const type = types[index];
    const tmp = types[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }

    await utils.viewer.appRoutingForms.forms.cancel();

    mutation.mutate({
      ids: newList?.map((type) => type.id),
    });
  }

  return (
    <>
      {workflows && workflows.length > 0 ? (
        <div className="bg-default border-subtle overflow-hidden rounded-md border sm:mx-0">
          <ul className="divide-subtle !static w-full divide-y" data-testid="workflow-list" ref={parent}>
            {workflows.map((workflow, index) => {
              const firstItem = workflows[0];
              const lastItem = workflows[workflows.length - 1];
              return (
                <li
                  key={workflow.id}
                  className="group flex w-full max-w-full items-center justify-between overflow-hidden">
                  {!(firstItem && firstItem.id === workflow.id) && (
                    <ArrowButton onClick={() => moveWorkflow(index, -1)} arrowDirection="up" />
                  )}
                  {!(lastItem && lastItem.id === workflow.id) && (
                    <ArrowButton onClick={() => moveWorkflow(index, 1)} arrowDirection="down" />
                  )}
                  <div className="first-line:group hover:bg-muted flex w-full items-center justify-between p-4 sm:px-6">
                    <Link href={`/workflows/${workflow.id}`} className="flex-grow cursor-pointer">
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
                              ? `Untitled (${`${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`
                                  .charAt(0)
                                  .toUpperCase()}${`${t(
                                  `${workflow.steps[0].action.toLowerCase()}_action`
                                )}`.slice(1)})`
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
                                  content={workflow.activeOn
                                    .filter((wf) => (workflow.teamId ? wf.eventType.parentId === null : true))
                                    .map((activeOn, key) => (
                                      <p key={key}>
                                        {activeOn.eventType.title}
                                        {activeOn.eventType._count.children > 0
                                          ? ` (+${activeOn.eventType._count.children})`
                                          : ""}
                                      </p>
                                    ))}>
                                  <div>
                                    <LinkIcon className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                                    {t("active_on_event_types", {
                                      count: workflow.activeOn.filter((wf) =>
                                        workflow.teamId ? wf.eventType.parentId === null : true
                                      ).length,
                                    })}
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
                          <div className="block md:hidden">
                            {workflow.team?.name && (
                              <li>
                                <Badge variant="gray">
                                  <>{workflow.team.name}</>
                                </Badge>
                              </li>
                            )}
                          </div>
                        </ul>
                      </div>
                    </Link>
                    <div>
                      <div className="hidden md:block">
                        {workflow.team?.name && (
                          <Badge className="mr-4 mt-1 p-[1px] px-2" variant="gray">
                            <Avatar
                              alt={workflow.team?.name || ""}
                              href={
                                workflow.team?.id
                                  ? `/settings/teams/${workflow.team?.id}/profile`
                                  : "/settings/my-account/profile"
                              }
                              imageSrc={getPlaceholderAvatar(
                                workflow?.team.logo,
                                workflow.team?.name as string
                              )}
                              size="xxs"
                              className="mt-[3px] inline-flex justify-center"
                            />
                            <div>{workflow.team.name}</div>
                          </Badge>
                        )}
                      </div>
                    </div>

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
                              onClick={async () => await router.replace(`/workflows/${workflow.id}`)}
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
                              <Button
                                type="button"
                                color="minimal"
                                variant="icon"
                                StartIcon={MoreHorizontal}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  StartIcon={Edit2}
                                  onClick={async () => await router.replace(`/workflows/${workflow.id}`)}>
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
              );
            })}
          </ul>
          <DeleteDialog
            isOpenDialog={deleteDialogOpen}
            setIsOpenDialog={setDeleteDialogOpen}
            workflowId={workflowToDeleteId}
            additionalFunction={async () => {
              await utils.viewer.workflows.filteredList.invalidate();
            }}
          />
        </div>
      ) : (
        <></>
      )}
    </>
  );
}
