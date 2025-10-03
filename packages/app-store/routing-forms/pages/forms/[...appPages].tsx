"use client";

import { TeamsFilter } from "@calid/features/modules/teams/components/filter/TeamsFilter";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import { Icon } from "@calid/features/ui/components/icon";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import { FilterResults } from "@calcom/features/filters/components/FilterResults";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { ArrowButton } from "@calcom/ui/components/arrow-button";
import { List } from "@calcom/ui/components/list";
import { ListItemAdvanced } from "@calcom/ui/components/list";

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
    <Button StartIcon="plus" onClick={() => setSelectTeamDialogState({ target: null })}>
      {t("new")}
    </Button>
  );
}

export default function RoutingForms({ appUrl }: { appUrl: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const hookForm = useFormContext<RoutingFormWithResponseCount>();
  const utils = trpc.useUtils();
  const [parent] = useAutoAnimate<HTMLUListElement>();

  const mutation = trpc.viewer.loggedInViewerRouter.calid_routingFormOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.appRoutingForms.calid_forms.cancel();
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

  const queryRes = trpc.viewer.appRoutingForms.calid_forms.useQuery({
    filters,
  });

  const { data: teams } = trpc.viewer.calidTeams.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [newFormDialogState, setNewFormDialogState] = useState<NewFormDialogState>(null);

  const [selectTeamDialogState, setSelectTeamDialogState] = useState<SelectTeamDialogState>(null);

  const forms = queryRes.data?.filtered;
  const _features = [
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

  function handleFormClick(formId: string) {
    router.push(`${appUrl}/form-edit/${formId}`);
  }

  return (
    // <LicenseRequired>
    <ShellMain heading={t("routing")} subtitle={t("routing_forms_description")}>
      <FormActionsProvider
        appUrl={appUrl}
        newFormDialogState={newFormDialogState}
        setNewFormDialogState={setNewFormDialogState}
        selectTeamDialogState={selectTeamDialogState}
        setSelectTeamDialogState={setSelectTeamDialogState}>
        <div className="mb-10 w-full">
          <div className="mb-2 flex flex-row justify-between">
            {teams && teams.length > 0 && <TeamsFilter />}
            {forms?.length && <NewFormButton setSelectTeamDialogState={setSelectTeamDialogState} />}
          </div>
          <FilterResults
            queryRes={queryRes}
            emptyScreen={
              <BlankCard
                Icon="git-merge"
                headline={t("create_your_first_form")}
                description={t("create_your_first_form_description")}
                buttonRaw={
                  <NewFormButton
                    setSelectTeamDialogState={(team) => {
                      setSelectTeamDialogState(team);
                    }}
                  />
                }
              />
            }
            noResultsScreen={
              <BlankCard
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
                      className="border-default group my-2 flex w-full max-w-full cursor-pointer items-center gap-2 overflow-hidden rounded border hover:shadow-md"
                      key={form.id}
                      onClick={() => handleFormClick(form.id)}>
                      <div
                        className="flex flex-col gap-1"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        {!(firstItem && firstItem.id === form.id) && (
                          <ArrowButton onClick={() => moveRoutingForm(index, -1)} arrowDirection="up" />
                        )}
                        {!(lastItem && lastItem.id === form.id) && (
                          <ArrowButton onClick={() => moveRoutingForm(index, 1)} arrowDirection="down" />
                        )}
                      </div>
                      <div className="flex-1">
                        <ListItemAdvanced
                          heading={form.name}
                          headingTrailingItem={
                            <div className="flex w-full flex-row items-center justify-between">
                              <div className="bg-muted dark:bg-default py-.5 flex h-6 flex-row items-center space-x-1 rounded px-2 rtl:space-x-reverse">
                                <FormLinkDisplay routingFormId={form.id} />
                                <Tooltip content={t("copy_link_to_form")}>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FormAction
                                      routingForm={form}
                                      action="copyLink"
                                      color="secondary"
                                      variant="icon"
                                      size="xs">
                                      <Icon name="link" className="h-3 w-3" />
                                    </FormAction>
                                  </div>
                                </Tooltip>
                                <Tooltip content={t("preview")}>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FormAction
                                      action="preview"
                                      routingForm={form}
                                      target="_blank"
                                      color="secondary"
                                      variant="icon"
                                      size="xs">
                                      <Icon name="external-link" className="h-3 w-3" />
                                    </FormAction>
                                  </div>
                                </Tooltip>
                                <Tooltip content={t("embed")}>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FormAction
                                      routingForm={form}
                                      action="embed"
                                      color="secondary"
                                      variant="icon"
                                      size="xs">
                                      <Icon name="code" className="h-3 w-3" />
                                    </FormAction>
                                  </div>
                                </Tooltip>
                              </div>

                              <div className="flex-1" />
                              {form.calIdTeam?.name && (
                                <div className="border-subtle mr-2 border-r-2">
                                  <Badge className="ltr:mr-2 rtl:ml-2" variant="secondary">
                                    {form.calIdTeam.name}
                                  </Badge>
                                </div>
                              )}

                              <div onClick={(e) => e.stopPropagation()}>
                                <FormAction
                                  disabled={readOnly}
                                  className="mr-2"
                                  action="toggle"
                                  routingForm={form}
                                />
                              </div>

                              <div onClick={(e) => e.stopPropagation()}>
                                <FormActionsDropdown disabled={readOnly}>
                                  <FormAction
                                    action="edit"
                                    color="minimal"
                                    routingForm={form}
                                    extraClassNames="!flex p-0">
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
                            </div>
                          }
                          disabled={readOnly}
                          subHeading={description}
                          className="space-x-2 rtl:space-x-reverse"
                          actions={<></>}>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" startIcon="menu">
                              {fields.length} {fields.length === 1 ? "field" : "fields"}
                            </Badge>
                            <Badge variant="secondary" startIcon="git-merge">
                              {userRoutes.length} {userRoutes.length === 1 ? "route" : "routes"}
                            </Badge>
                            <Badge variant="secondary" startIcon="message-circle">
                              {form._count.responses} {form._count.responses === 1 ? "response" : "responses"}
                            </Badge>
                          </div>
                        </ListItemAdvanced>
                      </div>
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
