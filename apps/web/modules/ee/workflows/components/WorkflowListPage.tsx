import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { getActionIcon } from "@calcom/features/ee/workflows/lib/getActionIcon";
import type { WorkflowListType } from "@calcom/features/ee/workflows/lib/types";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { DragButton } from "@calcom/ui/components/drag-button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { DeleteDialog } from "./DeleteDialog";

/** @deprecated Use WorkflowListType from ../lib/types instead */
export type WorkflowType = WorkflowListType;

interface SortableWorkflowItemProps {
  workflow: WorkflowType;
  setDeleteDialogOpen: (open: boolean) => void;
  setwWorkflowToDeleteId: (id: number) => void;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useLocale>["t"];
}

function SortableWorkflowItem({
  workflow,
  setDeleteDialogOpen,
  setwWorkflowToDeleteId,
  router,
  t,
}: SortableWorkflowItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: workflow.id,
  });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : undefined,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  const dataTestId = `workflow-${workflow.name.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      key={workflow.id}
      data-testid={dataTestId}
      className={classNames(
        "group flex w-full max-w-full items-center justify-between overflow-hidden",
        isDragging && "bg-cal-muted border-subtle border-t"
      )}>
      <DragButton listeners={listeners} attributes={attributes} />
      <div className="first-line:group hover:bg-cal-muted flex w-full items-center justify-between p-4 sm:px-6">
        <Link href={`/workflows/${workflow.id}`} className="grow cursor-pointer">
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
                      .toUpperCase()}${`${t(`${workflow.steps[0].action.toLowerCase()}_action`)}`.slice(1)})`
                  : "Untitled"}
              </div>
              <div>
                {(workflow.permissions?.readOnly ?? workflow.readOnly) && (
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
                  {workflow.isActiveOnAll ? (
                    <div>
                      <Icon name="link" className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                      {workflow.isOrg ? t("active_on_all_teams") : t("active_on_all_event_types")}
                    </div>
                  ) : workflow.activeOn && workflow.activeOn.length > 0 ? (
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
                        <Icon name="link" className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                        {t("active_on_event_types", {
                          count: workflow.activeOn.filter((wf) =>
                            workflow.teamId ? wf.eventType.parentId === null : true
                          ).length,
                        })}
                      </div>
                    </Tooltip>
                  ) : workflow.activeOnTeams && workflow.activeOnTeams.length > 0 ? (
                    <Tooltip
                      content={workflow.activeOnTeams.map((activeOn, key) => (
                        <p key={key}>{activeOn.team.name}</p>
                      ))}>
                      <div>
                        <Icon name="link" className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                        {t("active_on_teams", {
                          count: workflow.activeOnTeams?.length,
                        })}
                      </div>
                    </Tooltip>
                  ) : (
                    <div>
                      <Icon name="link" className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                      {workflow.isOrg ? t("no_active_teams") : t("no_active_event_types")}
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
              <Badge className="mb-2 mr-4 mt-1 p-px px-2" variant="gray">
                <Avatar
                  alt={workflow.team?.name || ""}
                  href={
                    workflow.team?.id
                      ? `/settings/teams/${workflow.team?.id}/profile`
                      : "/settings/my-account/profile"
                  }
                  imageSrc={getPlaceholderAvatar(workflow?.team.logo, workflow.team?.name as string)}
                  size="xs"
                  className="mt-[3px] inline-flex justify-center"
                />
                <div>{workflow.team.name}</div>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0">
          <div className="hidden sm:block">
            <ButtonGroup combined>
              <Tooltip content={t("edit") as string}>
                <Button
                  type="button"
                  color="secondary"
                  variant="icon"
                  StartIcon="pencil"
                  disabled={workflow.permissions ? !workflow.permissions?.canUpdate : workflow.readOnly}
                  onClick={async () => await router.replace(`/workflows/${workflow.id}`)}
                  data-testid="edit-button"
                />
              </Tooltip>
              <Tooltip content={t("delete") as string}>
                <Button
                  onClick={() => {
                    setDeleteDialogOpen(true);
                    setwWorkflowToDeleteId(workflow.id);
                  }}
                  color="destructive"
                  variant="icon"
                  disabled={workflow.permissions ? !workflow.permissions?.canDelete : workflow.readOnly}
                  StartIcon="trash-2"
                  data-testid="delete-button"
                />
              </Tooltip>
            </ButtonGroup>
          </div>
          {(workflow.permissions?.canUpdate ||
            workflow.permissions?.canDelete ||
            (!workflow.permissions && !workflow.readOnly)) && (
            <div className="block sm:hidden">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button type="button" color="minimal" variant="icon" StartIcon="ellipsis" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {(workflow.permissions ? workflow.permissions?.canUpdate : !workflow.readOnly) && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        StartIcon="pencil"
                        onClick={async () => await router.replace(`/workflows/${workflow.id}`)}>
                        {t("edit")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                  {(workflow.permissions ? workflow.permissions?.canDelete : !workflow.readOnly) && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        color="destructive"
                        StartIcon="trash-2"
                        onClick={() => {
                          setDeleteDialogOpen(true);
                          setwWorkflowToDeleteId(workflow.id);
                        }}>
                        {t("delete")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

interface Props {
  workflows: WorkflowType[] | undefined;
}
export default function WorkflowListPage({ workflows }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDeleteId, setwWorkflowToDeleteId] = useState(0);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const mutation = trpc.viewer.workflows.workflowOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.workflows.filteredList.cancel();
      await utils.viewer.workflows.filteredList.invalidate();
    },
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !workflows) return;

      const oldIndex = workflows.findIndex((wf) => wf.id === active.id);
      const newIndex = workflows.findIndex((wf) => wf.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedWorkflows = arrayMove(workflows, oldIndex, newIndex);

      utils.viewer.workflows.filteredList.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workflows: reorderedWorkflows,
        };
      });

      mutation.mutate({
        ids: reorderedWorkflows.map((wf) => wf.id),
      });
    },
    [workflows, mutation, utils]
  );

  const workflowIds = workflows?.map((wf) => wf.id) ?? [];

  return (
    <>
      {workflows && workflows.length > 0 ? (
        <div className="bg-default border-subtle overflow-hidden rounded-md border sm:mx-0">
          <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={workflowIds} strategy={verticalListSortingStrategy}>
              <ul className="divide-subtle static! w-full divide-y" data-testid="workflow-list">
                {workflows.map((workflow) => (
                  <SortableWorkflowItem
                    key={workflow.id}
                    workflow={workflow}
                    setDeleteDialogOpen={setDeleteDialogOpen}
                    setwWorkflowToDeleteId={setwWorkflowToDeleteId}
                    router={router}
                    t={t}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
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
