"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import { isFallbackRoute } from "@calcom/app-store/routing-forms/lib/isFallbackRoute";
import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { FilterResults } from "~/filters/components/FilterResults";
import { TeamsFilter } from "~/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { ArrowButton } from "@calcom/ui/components/arrow-button";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
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

export default function RoutingForms({ appUrl }: { appUrl: string }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const routerQuery = useRouterQuery();
  const hookForm = useFormContext<RoutingFormWithResponseCount>();
  const utils = trpc.useUtils();
  const [parent] = useAutoAnimate<HTMLUListElement>();

  const mutation = trpc.viewer.loggedInViewerRouter.routingFormOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.appRoutingForms.forms.cancel();
      await utils.viewer.appRoutingForms.invalidate();
    },
    onSettled: () => {
      utils.viewer.appRoutingForms.invalidate();
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

  async function moveRoutingForm(index: number, increment: 1 | -1) {
    const types = forms?.map((type) => {
      return type.form;
    });

    if (types?.length) {
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
  }

  return (
    <LicenseRequired>
      <ShellMain
        disableSticky={true}
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
                <Button color="minimal" href="https://cal.com/routing" target="_blank">
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
                  <List data-testid="routing-forms-list" ref={parent}>
                    {forms?.map(({ form, readOnly, hasError }, index) => {
                      // Make the form read only if it has an error
                      // TODO: Consider showing error in UI so user can report and get it fixed.
                      readOnly = readOnly || hasError;
                      if (!form) {
                        return null;
                      }

                      const description = form.description || "";
                      form.routes = form.routes || [];
                      const fields = form.fields || [];
                      const userRoutes = form.routes.filter((route) => !isFallbackRoute(route));
                      const firstItem = forms[0].form;
                      const lastItem = forms[forms.length - 1].form;

                      return (
                        <div
                          className="group flex w-full max-w-full items-center justify-between overflow-hidden"
                          key={form.id}>
                          {!(firstItem && firstItem.id === form.id) && (
                            <ArrowButton onClick={() => moveRoutingForm(index, -1)} arrowDirection="up" />
                          )}

                          {!(lastItem && lastItem.id === form.id) && (
                            <ArrowButton onClick={() => moveRoutingForm(index, 1)} arrowDirection="down" />
                          )}
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
                                <FormAction
                                  disabled={readOnly}
                                  className="self-center"
                                  action="toggle"
                                  routingForm={form}
                                />
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
                                    <FormAction
                                      action="download"
                                      routingForm={form}
                                      color="minimal"
                                      StartIcon="download">
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
                                      className="w-full rounded-t-none"
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
                                {form._count.responses}{" "}
                                {form._count.responses === 1 ? "response" : "responses"}
                              </Badge>
                            </div>
                          </ListLinkItem>
                        </div>
                      );
                    })}
                  </List>
                </div>
              </FilterResults>
            </div>
          </FormActionsProvider>
        </UpgradeTip>
      </ShellMain>
    </LicenseRequired>
  );
}
