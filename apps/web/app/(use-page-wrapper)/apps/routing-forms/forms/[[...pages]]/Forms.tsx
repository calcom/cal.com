"use client";

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
import posthog from "posthog-js";
import { useCallback, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import { isFallbackRoute } from "@calcom/app-store/routing-forms/lib/isFallbackRoute";
import type { RoutingForm, RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { DragButton } from "@calcom/ui/components/drag-button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import { List, ListLinkItem } from "@calcom/ui/components/list";
import { Tooltip } from "@calcom/ui/components/tooltip";
import type {
  SetNewFormDialogState,
  NewFormDialogState,
} from "@calcom/web/components/apps/routing-forms/FormActions";
import {
  FormAction,
  FormActionsDropdown,
  FormActionsProvider,
} from "@calcom/web/components/apps/routing-forms/FormActions";

import { useHasPaidPlan } from "~/billing/hooks/useHasPaidPlan";
import SkeletonLoaderTeamList from "~/ee/teams/components/SkeletonloaderTeamList";
import { CreateButtonWithTeamsList } from "~/ee/teams/components/createButton/CreateButtonWithTeamsList";
import { ShellMain } from "~/shell/Shell";
import { UpgradeTip } from "~/shell/UpgradeTip";

function NewFormButton({ setNewFormDialogState }: { setNewFormDialogState: SetNewFormDialogState }) {
  const { t } = useLocale();
  return (
    <CreateButtonWithTeamsList
      subtitle={t("create_routing_form_on").toUpperCase()}
      data-testid="new-routing-form"
      createFunction={(teamId) => {
        setNewFormDialogState({ action: "new", target: teamId ? String(teamId) : "" });
        posthog.capture("new_routing_form_button_clicked", { teamId });
      }}
      withPermission={{
        permission: "routingForm.create",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      }}
    />
  );
}

// The form type from the query includes team and _count which are not in RoutingForm
// We use RoutingForm for FormAction compatibility and add the extra properties
type QueryForm = RoutingForm & {
  team?: { name: string; id: number } | null;
  _count: { responses: number };
};

interface SortableFormItemProps {
  form: QueryForm;
  readOnly: boolean;
  appUrl: string;
  t: ReturnType<typeof useLocale>["t"];
}

function SortableFormItem({ form, readOnly, appUrl, t }: SortableFormItemProps): JSX.Element | null {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: form.id,
  });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : undefined,
  };

  const description = form.description || "";
  form.routes = form.routes || [];
  const fields = form.fields || [];
  const userRoutes = form.routes.filter((route) => !isFallbackRoute(route));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classNames(
        "group flex w-full max-w-full items-center justify-between overflow-hidden",
        isDragging && "border-emphasis rounded-md border-2"
      )}
      key={form.id}>
      <DragButton listeners={listeners} attributes={attributes} />
      <ListLinkItem
        href={`${appUrl}/form-edit/${form.id}`}
        heading={form.name}
        readOnly={readOnly}
        subHeading={description}
        className="space-x-2 rtl:space-x-reverse"
        actions={
          <>
            {form.team?.name && (
              <div className="border-subtle border-r-2">
                <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
                  {form.team.name}
                </Badge>
              </div>
            )}
            <FormAction disabled={readOnly} className="self-center" action="toggle" routingForm={form} />
            <ButtonGroup combined>
              <Tooltip content={t("preview")}>
                <FormAction
                  action="preview"
                  routingForm={form}
                  target="_blank"
                  StartIcon="external-link"
                  color="secondary"
                  variant="icon"
                />
              </Tooltip>
              <FormAction
                routingForm={form}
                action="copyLink"
                color="secondary"
                variant="icon"
                StartIcon="link"
                tooltip={t("copy_link_to_form")}
              />
              <FormAction
                routingForm={form}
                action="embed"
                color="secondary"
                variant="icon"
                StartIcon="code"
                tooltip={t("embed")}
              />
              <FormActionsDropdown disabled={readOnly}>
                <FormAction
                  action="edit"
                  routingForm={form}
                  color="minimal"
                  className="flex!"
                  StartIcon="pencil">
                  {t("edit")}
                </FormAction>
                <FormAction action="download" routingForm={form} color="minimal" StartIcon="download">
                  {t("download_responses")}
                </FormAction>
                <FormAction
                  action="duplicate"
                  routingForm={form}
                  color="minimal"
                  className="w-full"
                  StartIcon="copy">
                  {t("duplicate")}
                </FormAction>
                <FormAction
                  action="_delete"
                  routingForm={form}
                  color="destructive"
                  className="w-full"
                  StartIcon="trash">
                  {t("delete")}
                </FormAction>
              </FormActionsDropdown>
            </ButtonGroup>
          </>
        }>
        <div className="flex flex-wrap gap-1">
          <Badge variant="gray" startIcon="menu">
            {fields.length} {fields.length === 1 ? "field" : "fields"}
          </Badge>
          <Badge variant="gray" startIcon="git-merge">
            {userRoutes.length} {userRoutes.length === 1 ? "route" : "routes"}
          </Badge>
          <Badge variant="gray" startIcon="message-circle">
            {form._count.responses} {form._count.responses === 1 ? "response" : "responses"}
          </Badge>
        </div>
      </ListLinkItem>
    </div>
  );
}

export default function RoutingForms({ appUrl }: { appUrl: string }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const routerQuery = useRouterQuery();
  const hookForm = useFormContext<RoutingFormWithResponseCount>();
  const utils = trpc.useUtils();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const mutation = trpc.viewer.loggedInViewerRouter.routingFormOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.appRoutingForms.forms.cancel();
      await utils.viewer.appRoutingForms.invalidate();
    },
  });

  useEffect(() => {
    hookForm.reset({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filters = getTeamsFiltersFromQuery(routerQuery);

  const queryRes = trpc.viewer.appRoutingForms.forms.useQuery({
    filters,
  });

  const [newFormDialogState, setNewFormDialogState] = useState<NewFormDialogState>(null);

  const forms = queryRes.data?.filtered;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !forms) return;

      const oldIndex = forms.findIndex((f) => f.form?.id === active.id);
      const newIndex = forms.findIndex((f) => f.form?.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedForms = arrayMove(forms, oldIndex, newIndex);

      utils.viewer.appRoutingForms.forms.setData({ filters }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          filtered: reorderedForms,
        };
      });

      mutation.mutate({
        ids: reorderedForms.map((f) => f.form?.id).filter((id): id is string => id !== undefined),
      });
    },
    [forms, mutation, utils, filters]
  );

  const formIds = forms?.map((f) => f.form?.id).filter((id): id is string => id !== undefined) ?? [];

  const features = [
    {
      icon: <Icon name="file-text" className="h-5 w-5 text-orange-500" />,
      title: t("create_your_first_form"),
      description: t("create_your_first_form_description"),
    },
    {
      icon: <Icon name="shuffle" className="h-5 w-5 text-lime-500" />,
      title: t("create_your_first_route"),
      description: t("route_to_the_right_person"),
    },
    {
      icon: <Icon name="chart-bar" className="h-5 w-5 text-blue-500" />,
      title: t("reporting"),
      description: t("reporting_feature"),
    },
    {
      icon: <Icon name="circle-check" className="h-5 w-5 text-teal-500" />,
      title: t("test_routing_form"),
      description: t("test_preview_description"),
    },
    {
      icon: <Icon name="mail" className="h-5 w-5 text-yellow-500" />,
      title: t("routing_forms_send_email_owner"),
      description: t("routing_forms_send_email_owner_description"),
    },
    {
      icon: <Icon name="download" className="h-5 w-5 text-violet-500" />,
      title: t("download_responses"),
      description: t("download_responses_description"),
    },
  ];

  return (
    <LicenseRequired>
      <ShellMain
        heading={t("routing")}
        CTA={
          hasPaidPlan && forms?.length ? (
            <NewFormButton setNewFormDialogState={setNewFormDialogState} />
          ) : null
        }
        subtitle={t("routing_forms_description")}>
        <UpgradeTip
          plan="team"
          title={t("teams_plan_required")}
          description={t("routing_forms_are_a_great_way")}
          features={features}
          background="/tips/routing-forms"
          isParentLoading={<SkeletonLoaderTeamList />}
          buttons={
            <div className="stack-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                  {t("upgrade")}
                </Button>
                <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          <FormActionsProvider
            appUrl={appUrl}
            newFormDialogState={newFormDialogState}
            setNewFormDialogState={setNewFormDialogState}>
            <div className="mb-10 w-full">
              <div className="mb-2 flex">
                <TeamsFilter />
              </div>
              <FilterResults
                queryRes={queryRes}
                emptyScreen={
                  <EmptyScreen
                    Icon="git-merge"
                    headline={t("create_your_first_form")}
                    description={t("create_your_first_form_description")}
                    buttonRaw={<NewFormButton setNewFormDialogState={setNewFormDialogState} />}
                  />
                }
                noResultsScreen={
                  <EmptyScreen
                    Icon="git-merge"
                    headline={t("no_results_for_filter")}
                    description={t("change_filter_common")}
                  />
                }
                SkeletonLoader={SkeletonLoaderTeamList}>
                <div className="bg-default mb-16 overflow-hidden">
                  <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      modifiers={[restrictToVerticalAxis]}>
                    <SortableContext items={formIds} strategy={verticalListSortingStrategy}>
                      <List data-testid="routing-forms-list">
                        {forms?.map(({ form, readOnly, hasError }) => {
                          readOnly = readOnly || hasError;
                          if (!form) {
                            return null;
                          }

                          return (
                            <SortableFormItem
                              key={form.id}
                              form={form as QueryForm}
                              readOnly={readOnly}
                              appUrl={appUrl}
                              t={t}
                            />
                          );
                        })}
                      </List>
                    </SortableContext>
                  </DndContext>
                </div>
              </FilterResults>
            </div>
          </FormActionsProvider>
        </UpgradeTip>
      </ShellMain>
    </LicenseRequired>
  );
}
