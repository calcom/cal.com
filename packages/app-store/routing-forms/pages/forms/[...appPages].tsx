"use client";

import { Icon } from "@calid/features/ui/components/icon";
import { Button } from "@calid/features/ui/components/button";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { ArrowButton } from "@calcom/ui/components/arrow-button";
import { Badge } from "@calcom/ui/components/badge";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { List } from "@calcom/ui/components/list";
import { ListItemAdvanced } from "@calcom/ui/components/list";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { NewFormDialogState } from "../../components/FormActions";
import type { SelectTeamDialogState, SetSelectTeamDialogState } from "../../components/FormActions";
import {
  FormAction,
  FormActionsDropdown,
  FormLinkDisplay,
  FormActionsProvider,
} from "../../components/FormActions";
import { isFallbackRoute } from "../../lib/isFallbackRoute";
import type { RoutingFormWithResponseCount } from "../../types/types";

function NewFormButton({ setSelectTeamDialogState }: { setSelectTeamDialogState: SetSelectTeamDialogState }) {
  const { t } = useLocale();
  return (
    <Button onClick={() => setSelectTeamDialogState({ target: null })}>
      <Icon name="plus" className="h-4 w-4" />
      <span>{t("new")}</span>
    </Button>

    // <CreateButtonWithTeamsList
    //   subtitle={t("create_routing_form_on").toUpperCase()}
    //   data-testid="new-routing-form"
    //   createFunction={(teamId) => {
    //     setNewFormDialogState({ action: "new", target: teamId ? String(teamId) : "" });
    //   }}
    // />
  );
}

export default function RoutingForms({ appUrl }: { appUrl: string }) {
  const { t } = useLocale();
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

  const [selectTeamDialogState, setSelectTeamDialogState] = useState<SelectTeamDialogState>(null);

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
    // <LicenseRequired>
    <ShellMain
      heading={t("routing")}
      // CTA={
      // }
      subtitle={t("routing_forms_description")}>
      {/* <UpgradeTip
        plan="team"
        title={t("teams_plan_required")}
        description={t("routing_forms_are_a_great_way")}
        features={features}
        background="/tips/routing-forms"
        isParentLoading={<SkeletonLoaderTeamList />}
        buttons={
          <div className="space-y-2 sm:space-x-2 rtl:space-x-reverse">
            <ButtonGroup>
              <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("upgrade")}
              </Button>
              <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
                {t("learn_more")}
              </Button>
            </ButtonGroup>
          </div>
        }> */}
      <FormActionsProvider
        appUrl={appUrl}
        newFormDialogState={newFormDialogState}
        setNewFormDialogState={setNewFormDialogState}
        selectTeamDialogState={selectTeamDialogState}
        setSelectTeamDialogState={setSelectTeamDialogState}>
        <div className="mb-10 w-full">
          <div className="mb-2 flex flex-row justify-between">
            <TeamsFilter />
            {forms?.length && <NewFormButton setSelectTeamDialogState={setSelectTeamDialogState} />}
          </div>
          <FilterResults
            queryRes={queryRes}
            emptyScreen={
              <EmptyScreen
                Icon="git-merge"
                headline={t("create_your_first_form")}
                description={t("create_your_first_form_description")}
                buttonRaw={
                  <NewFormButton
                    setSelectTeamDialogState={(team) => {
                      console.log("Toggling dialog: ", selectTeamDialogState);
                      setSelectTeamDialogState(team);
                    }}
                  />
                }
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
              <List noBorderTreatment roundContainer data-testid="routing-forms-list" ref={parent}>
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
                      className="border-subtle group my-2 flex w-full max-w-full items-center justify-between gap-4 overflow-hidden rounded border"
                      key={form.id}>
                      {!(firstItem && firstItem.id === form.id) && (
                        <ArrowButton onClick={() => moveRoutingForm(index, -1)} arrowDirection="up" />
                      )}

                      {!(lastItem && lastItem.id === form.id) && (
                        <ArrowButton onClick={() => moveRoutingForm(index, 1)} arrowDirection="down" />
                      )}
                      <ListItemAdvanced
                        // href={`${appUrl}/form-edit/${form.id}`}
                        heading={form.name}
                        headingTrailingItem={
                          <div className="flex w-full flex-row items-center justify-between">
                            <div className="bg-muted py-.5 flex h-6 flex-row items-center space-x-1 rounded px-2 rtl:space-x-reverse">
                              <FormLinkDisplay routingFormId={form.id} />
                              <Tooltip content={t("copy_link_to_form")}>
                                <FormAction
                                  routingForm={form}
                                  action="copyLink"
                                  color="secondary"
                                  variant="icon"
                                  size="xs">
                                  <Icon name="link" className="h-3 w-3" />
                                </FormAction>
                              </Tooltip>
                              <Tooltip content={t("preview")}>
                                <FormAction
                                  action="preview"
                                  routingForm={form}
                                  target="_blank"
                                  color="secondary"
                                  variant="icon"
                                  size="xs">
                                  <Icon name="external-link" className="h-3 w-3" />
                                </FormAction>
                              </Tooltip>
                              <FormAction
                                routingForm={form}
                                action="embed"
                                color="secondary"
                                variant="icon"
                                size="xs">
                                <Icon name="code" className="h-3 w-3" />
                              </FormAction>
                            </div>

                            <div class="flex-1" />
                            {form.team?.name && (
                              <div className="border-subtle mr-2 border-r-2">
                                <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
                                  {form.team.name}
                                </Badge>
                              </div>
                            )}

                            <FormAction
                              disabled={readOnly}
                              className="mr-2"
                              action="toggle"
                              size="xs"
                              routingForm={form}
                            />

                            <FormActionsDropdown disabled={readOnly} className="ml-2">
                              <FormAction action="edit" color="minimal" routingForm={form} className="!flex">
                                {t("edit")}
                              </FormAction>
                              <FormAction action="download" routingForm={form}>
                                {t("download_responses")}
                              </FormAction>
                              <FormAction action="duplicate" routingForm={form} className="w-full">
                                {t("duplicate")}
                              </FormAction>
                              <FormAction
                                action="_delete"
                                routingForm={form}
                                className="text-cal-destructive w-full ">
                                {t("delete")}
                              </FormAction>
                            </FormActionsDropdown>
                          </div>
                        }
                        disabled={readOnly}
                        subHeading={description}
                        className="space-x-2 rtl:space-x-reverse"
                        actions={<></>}>
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
                      </ListItemAdvanced>
                    </div>
                  );
                })}
              </List>
            </div>
          </FilterResults>
        </div>
      </FormActionsProvider>
      {/* </UpgradeTip> */}
    </ShellMain>
    // </LicenseRequired>
  );
}
