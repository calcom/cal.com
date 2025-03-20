import type { App_RoutingForms_Form, Team } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import AddMembersWithSwitch from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { ShellMain } from "@calcom/features/shell/Shell";
import { IS_CALCOM } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import type { Brand } from "@calcom/types/utils";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogClose } from "@calcom/ui/components/dialog";
import { VerticalDivider } from "@calcom/ui/components/divider";
import { DropdownMenuSeparator } from "@calcom/ui/components/dropdown";
import { Form } from "@calcom/ui/components/form";
import { TextAreaField } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { TRPCClientError } from "@trpc/react-query";

import { getAbsoluteEventTypeRedirectUrl } from "../getEventTypeRedirectUrl";
import { RoutingPages } from "../lib/RoutingPages";
import { isFallbackRoute } from "../lib/isFallbackRoute";
import { findMatchingRoute } from "../lib/processRoute";
import type { FormResponse, NonRouterRoute, SerializableForm } from "../types/types";
import type { NewFormDialogState } from "./FormActions";
import { FormAction, FormActionsDropdown, FormActionsProvider } from "./FormActions";
import FormInputFields from "./FormInputFields";
import { InfoLostWarningDialog } from "./InfoLostWarningDialog";
import RoutingNavBar from "./RoutingNavBar";
import { getServerSidePropsForSingleFormView } from "./getServerSidePropsSingleForm";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

export type RoutingFormWithResponseCount = RoutingForm & {
  team: {
    slug: Team["slug"];
    name: Team["name"];
  } | null;
  _count: {
    responses: number;
  };
};

const Actions = ({
  form,
  mutation,
}: {
  form: RoutingFormWithResponseCount;
  mutation: {
    isPending: boolean;
  };
}) => {
  const { t } = useLocale();

  return (
    <div className="flex items-center">
      <div className="hidden items-center sm:inline-flex">
        <FormAction className="self-center" data-testid="toggle-form" action="toggle" routingForm={form} />
        <VerticalDivider />
      </div>
      <ButtonGroup combined containerProps={{ className: "hidden md:inline-flex items-center" }}>
        <Tooltip sideOffset={4} content={t("preview")} side="bottom">
          <FormAction
            routingForm={form}
            color="secondary"
            target="_blank"
            variant="icon"
            type="button"
            rel="noreferrer"
            action="preview"
            StartIcon="external-link"
          />
        </Tooltip>
        <FormAction
          routingForm={form}
          action="copyLink"
          color="secondary"
          variant="icon"
          type="button"
          StartIcon="link"
          tooltip={t("copy_link_to_form")}
          tooltipSide="bottom"
        />
        <Tooltip sideOffset={4} content={t("download_responses")} side="bottom">
          <FormAction
            data-testid="download-responses"
            routingForm={form}
            action="download"
            color="secondary"
            variant="icon"
            type="button"
            StartIcon="download"
          />
        </Tooltip>
        <FormAction
          routingForm={form}
          action="embed"
          color="secondary"
          variant="icon"
          StartIcon="code"
          tooltip={t("embed")}
          tooltipSide="bottom"
        />
        <DropdownMenuSeparator />
        <FormAction
          routingForm={form}
          action="_delete"
          // className="mr-3"
          variant="icon"
          StartIcon="trash"
          color="secondary"
          type="button"
          tooltip={t("delete")}
          tooltipSide="bottom"
        />
      </ButtonGroup>

      <div className="flex md:hidden">
        <FormActionsDropdown>
          <FormAction
            routingForm={form}
            color="minimal"
            target="_blank"
            type="button"
            rel="noreferrer"
            action="preview"
            StartIcon="external-link">
            {t("preview")}
          </FormAction>
          <FormAction
            action="copyLink"
            className="w-full"
            routingForm={form}
            color="minimal"
            type="button"
            StartIcon="link">
            {t("copy_link_to_form")}
          </FormAction>
          <FormAction
            action="download"
            routingForm={form}
            className="w-full"
            color="minimal"
            type="button"
            StartIcon="download">
            {t("download_responses")}
          </FormAction>
          <FormAction
            action="embed"
            routingForm={form}
            color="minimal"
            type="button"
            className="w-full"
            StartIcon="code">
            {t("embed")}
          </FormAction>
          <DropdownMenuSeparator className="hidden sm:block" />
          <FormAction
            action="_delete"
            routingForm={form}
            className="w-full"
            type="button"
            color="destructive"
            StartIcon="trash">
            {t("delete")}
          </FormAction>
          <div className="block sm:hidden">
            <DropdownMenuSeparator />
            <FormAction
              data-testid="toggle-form"
              action="toggle"
              routingForm={form}
              label="Disable Form"
              extraClassNames="hover:bg-subtle cursor-pointer rounded-[5px] pr-4 transition"
            />
          </div>
        </FormActionsDropdown>
      </div>
      <VerticalDivider />
      <Button data-testid="update-form" loading={mutation.isPending} type="submit" color="primary">
        {t("save")}
      </Button>
    </div>
  );
};

type SingleFormComponentProps = {
  form: RoutingFormWithResponseCount;
  appUrl: string;
  Page: React.FC<{
    form: RoutingFormWithResponseCount;
    appUrl: string;
    hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  }>;
  enrichedWithUserProfileForm: inferSSRProps<
    typeof getServerSidePropsForSingleFormView
  >["enrichedWithUserProfileForm"];
};

type MembersMatchResultType = {
  isUsingAttributeWeights: boolean;
  eventTypeRedirectUrl: string | null;
  contactOwnerEmail: string | null;
  teamMembersMatchingAttributeLogic: { id: number; name: string | null; email: string }[] | null;
  perUserData: {
    bookingsCount: Record<number, number>;
    bookingShortfalls: Record<number, number> | null;
    calibrations: Record<number, number> | null;
    weights: Record<number, number> | null;
  } | null;
  checkedFallback: boolean;
  mainWarnings: string[] | null;
  fallbackWarnings: string[] | null;
} | null;

const TeamMembersMatchResult = ({
  membersMatchResult,
  chosenRouteName,
  showAllData,
}: {
  membersMatchResult: MembersMatchResultType;
  chosenRouteName: string;
  showAllData: boolean;
}) => {
  const { t } = useLocale();
  if (!membersMatchResult) return null;

  const hasMainWarnings = (membersMatchResult.mainWarnings?.length ?? 0) > 0;
  const hasFallbackWarnings = (membersMatchResult.fallbackWarnings?.length ?? 0) > 0;

  const renderFallbackLogicStatus = () => {
    if (!membersMatchResult.checkedFallback) {
      return t("fallback_not_needed");
    } else if (
      isNoLogicFound(membersMatchResult.teamMembersMatchingAttributeLogic) ||
      membersMatchResult.teamMembersMatchingAttributeLogic.length > 0
    ) {
      return t("yes");
    } else {
      return t("no");
    }
  };

  const renderMainLogicStatus = () => {
    return !membersMatchResult.checkedFallback ? t("yes") : t("no");
  };

  const renderQueue = () => {
    if (isNoLogicFound(membersMatchResult.teamMembersMatchingAttributeLogic)) {
      if (!showAllData) return <div className="mt-4">{t("no_active_queues")}asdf</div>;
      if (membersMatchResult.checkedFallback) {
        return (
          <span className="font-semibold">
            {t(
              "all_assigned_members_of_the_team_event_type_consider_adding_some_attribute_rules_to_fallback"
            )}
          </span>
        );
      }
      return (
        <span className="font-semibold">
          {t("all_assigned_members_of_the_team_event_type_consider_adding_some_attribute_rules")}
        </span>
      );
    }

    const matchingMembers = membersMatchResult.teamMembersMatchingAttributeLogic;

    if (matchingMembers.length && membersMatchResult.perUserData) {
      const perUserData = membersMatchResult.perUserData;
      return (
        <span className="font-semibold">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">{t("email")}</th>
                  <th className="py-2 pr-4">{t("bookings")}</th>
                  {membersMatchResult.perUserData.weights ? <th className="py-2">{t("weight")}</th> : null}
                  {membersMatchResult.perUserData.calibrations ? (
                    <th className="py-2">{t("calibration")}</th>
                  ) : null}
                  {membersMatchResult.perUserData.bookingShortfalls ? (
                    <th className="border-l py-2 pl-2">{t("shortfall")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {matchingMembers.map((member, index) => (
                  <tr key={member.id} className="border-b">
                    <td className="py-2 pr-4">{index + 1}</td>
                    <td className="py-2 pr-4">{member.email}</td>
                    <td className="py-2">{perUserData.bookingsCount[member.id] ?? 0}</td>
                    {perUserData.weights ? (
                      <td className="py-2">{perUserData.weights[member.id] ?? 0}</td>
                    ) : null}
                    {perUserData.calibrations ? (
                      <td className="py-2">{perUserData.calibrations[member.id] ?? 0}</td>
                    ) : null}
                    {perUserData.bookingShortfalls ? (
                      <td className="border-l py-2 pl-2">{perUserData.bookingShortfalls[member.id] ?? 0}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </span>
      );
    }

    return (
      <span className="font-semibold">
        {t("all_assigned_members_of_the_team_event_type_consider_tweaking_fallback_to_have_a_match")}
      </span>
    );
  };

  return (
    <div className="text-default mt-2 space-y-2">
      {showAllData ? (
        <>
          <div data-testid="chosen-route">
            {t("chosen_route")}: <span className="font-semibold">{chosenRouteName}</span>
          </div>
          <div data-testid="attribute-logic-matched" className={classNames(hasMainWarnings && "text-error")}>
            {t("attribute_logic_matched")}: <span className="font-semibold">{renderMainLogicStatus()}</span>
            {hasMainWarnings && (
              <Alert
                className="mt-2"
                severity="warning"
                title={membersMatchResult.mainWarnings?.join(", ")}
              />
            )}
          </div>
          <div
            data-testid="attribute-logic-fallback-matched"
            className={classNames(hasFallbackWarnings && "text-error")}>
            {t("attribute_logic_fallback_matched")}:{" "}
            <span className="font-semibold">{renderFallbackLogicStatus()}</span>
            {hasFallbackWarnings && (
              <Alert
                className="mt-2"
                severity="warning"
                title={membersMatchResult.fallbackWarnings?.join(", ")}
              />
            )}
          </div>
        </>
      ) : (
        <></>
      )}
      <div className="mt-4">
        {membersMatchResult.contactOwnerEmail ? (
          <div data-testid="contact-owner-email">
            {t("contact_owner")}:{" "}
            <span className="font-semibold">{membersMatchResult.contactOwnerEmail}</span>
          </div>
        ) : showAllData ? (
          <div data-testid="contact-owner-email">
            {t("contact_owner")}: <span className="font-semibold">Not found</span>
          </div>
        ) : (
          <></>
        )}
        <div className="mt-2" data-testid="matching-members">
          {showAllData ? (
            <>
              {membersMatchResult.isUsingAttributeWeights
                ? t("matching_members_queue_using_attribute_weights")
                : t("matching_members_queue_using_event_assignee_weights")}
            </>
          ) : (
            <></>
          )}
          {renderQueue()}
        </div>
      </div>
    </div>
  );

  function isNoLogicFound(
    teamMembersMatchingAttributeLogic: NonNullable<MembersMatchResultType>["teamMembersMatchingAttributeLogic"]
  ): teamMembersMatchingAttributeLogic is null {
    return teamMembersMatchingAttributeLogic === null;
  }
};

/**
 * It has the the ongoing changes in the form along with enrichedWithUserProfileForm specific data.
 * So, it can be used to test the form in the test preview dialog without saving the changes even.
 */
type UptoDateForm = Brand<
  NonNullable<SingleFormComponentProps["enrichedWithUserProfileForm"]>,
  "UptoDateForm"
>;

export const TestForm = ({
  form,
  supportsTeamMembersMatchingLogic,
  showAllData = true,
  renderFooter,
}: {
  form: UptoDateForm | RoutingForm;
  supportsTeamMembersMatchingLogic: boolean;
  showAllData?: boolean;
  renderFooter?: (onClose: () => void) => React.ReactNode;
}) => {
  const { t } = useLocale();
  const [response, setResponse] = useState<FormResponse>({});
  const [chosenRoute, setChosenRoute] = useState<NonRouterRoute | null>(null);
  const [eventTypeUrlWithoutParams, setEventTypeUrlWithoutParams] = useState("");
  const searchParams = useCompatSearchParams();
  const [membersMatchResult, setMembersMatchResult] = useState<MembersMatchResultType | null>(null);

  const resetMembersMatchResult = () => {
    setMembersMatchResult(null);
  };
  const findTeamMembersMatchingAttributeLogicMutation =
    trpc.viewer.routingForms.findTeamMembersMatchingAttributeLogicOfRoute.useMutation({
      onSuccess(data) {
        setMembersMatchResult({
          isUsingAttributeWeights: data.isUsingAttributeWeights,
          eventTypeRedirectUrl: data.eventTypeRedirectUrl,
          contactOwnerEmail: data.contactOwnerEmail,
          teamMembersMatchingAttributeLogic: data.result ? data.result.users : data.result,
          perUserData: data.result ? data.result.perUserData : null,
          checkedFallback: data.checkedFallback,
          mainWarnings: data.mainWarnings,
          fallbackWarnings: data.fallbackWarnings,
        });
      },
      onError(e) {
        if (e instanceof TRPCClientError) {
          showToast(e.message, "error");
        } else {
          showToast(t("something_went_wrong"), "error");
        }
      },
    });

  function testRouting() {
    const route = findMatchingRoute({ form, response });
    let eventTypeRedirectUrl: string | null = null;

    if (route?.action?.type === "eventTypeRedirectUrl") {
      // only needed in routing form testing (type UptoDateForm)
      if ("team" in form) {
        eventTypeRedirectUrl = getAbsoluteEventTypeRedirectUrl({
          eventTypeRedirectUrl: route.action.value,
          form,
          allURLSearchParams: new URLSearchParams(),
        });
        setEventTypeUrlWithoutParams(eventTypeRedirectUrl);
      }
    }

    setChosenRoute(route || null);

    if (!route) return;

    if (supportsTeamMembersMatchingLogic) {
      findTeamMembersMatchingAttributeLogicMutation.mutate({
        formId: form.id,
        response,
        route,
        isPreview: true,
        _enablePerf: searchParams.get("enablePerf") === "true",
      });
    }
  }

  const renderTestResult = (showAllData: boolean) => {
    if (!form.routes || !chosenRoute) return null;

    const chosenRouteIndex = form.routes.findIndex((route) => route.id === chosenRoute.id);

    const chosenRouteName = () => {
      if (chosenRoute.isFallback) {
        return t("fallback_route");
      }
      return `Route ${chosenRouteIndex + 1}`;
    };

    const renderTeamMembersMatchResult = (showAllData: boolean, isPending: boolean) => {
      if (!supportsTeamMembersMatchingLogic) return null;
      if (isPending) return <div>Loading...</div>;

      return (
        <div>
          <TeamMembersMatchResult
            chosenRouteName={chosenRouteName()}
            membersMatchResult={membersMatchResult}
            showAllData={showAllData}
          />
        </div>
      );
    };

    if (!showAllData) {
      if (
        chosenRoute.action.type !== "customPageMessage" &&
        chosenRoute.action.type !== "externalRedirectUrl"
      ) {
        {
          return renderTeamMembersMatchResult(false, findTeamMembersMatchingAttributeLogicMutation.isPending);
        }
      }
      return <div className="mt-4">{t("no_active_queues")}</div>;
    }

    return (
      <div className="bg-subtle text-default mt-5 rounded-md p-3">
        <div className="font-bold ">{t("route_to")}:</div>
        <div className="mt-2">
          {RoutingPages.map((page) => {
            if (page.value !== chosenRoute.action.type) return null;
            return (
              <span key={page.value} data-testid="test-routing-result-type">
                {page.label}
              </span>
            );
          })}
          :{" "}
          {chosenRoute.action.type === "customPageMessage" ? (
            <span className="text-default" data-testid="test-routing-result">
              {chosenRoute.action.value}
            </span>
          ) : chosenRoute.action.type === "externalRedirectUrl" ? (
            <span className="text-default underline">
              <a
                target="_blank"
                data-testid="test-routing-result"
                href={
                  chosenRoute.action.value.includes("https://") ||
                  chosenRoute.action.value.includes("http://")
                    ? chosenRoute.action.value
                    : `http://${chosenRoute.action.value}`
                }
                rel="noreferrer">
                {chosenRoute.action.value}
              </a>
            </span>
          ) : (
            <div className="flex flex-col space-y-2">
              <span className="text-default underline">
                <a
                  target="_blank"
                  className={classNames(
                    findTeamMembersMatchingAttributeLogicMutation.isPending && "pointer-events-none"
                  )}
                  href={membersMatchResult?.eventTypeRedirectUrl ?? eventTypeUrlWithoutParams}
                  rel="noreferrer"
                  data-testid="test-routing-result">
                  {chosenRoute.action.value}
                </a>
              </span>
              {renderTeamMembersMatchResult(
                showAllData,
                findTeamMembersMatchingAttributeLogicMutation.isPending
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const onClose = () => {
    setChosenRoute(null);
    setResponse({});
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        resetMembersMatchResult();
        testRouting();
      }}>
      <div className="px-1">
        {form && <FormInputFields form={form} response={response} setResponse={setResponse} />}
      </div>
      {!renderFooter ? (
        <div className="mt-4">
          <Button type="submit">{t("show_matching_hosts")}</Button>
        </div>
      ) : (
        <></>
      )}
      <div>{renderTestResult(showAllData)}</div>
      {renderFooter?.(onClose)}
    </form>
  );
};

export const TestFormDialog = ({
  form,
  isTestPreviewOpen,
  setIsTestPreviewOpen,
}: {
  form: UptoDateForm;
  isTestPreviewOpen: boolean;
  setIsTestPreviewOpen: (value: boolean) => void;
}) => {
  const { t } = useLocale();
  const isSubTeamForm = !!form.team?.parentId;
  return (
    <Dialog open={isTestPreviewOpen} onOpenChange={setIsTestPreviewOpen}>
      <DialogContent size="md" enableOverflow>
        <DialogHeader title={t("test_routing_form")} subtitle={t("test_preview_description")} />
        <div>
          <TestForm
            form={form}
            supportsTeamMembersMatchingLogic={isSubTeamForm}
            renderFooter={(onClose) => (
              <DialogFooter>
                <DialogClose
                  color="secondary"
                  onClick={() => {
                    setIsTestPreviewOpen(false);
                    onClose();
                  }}>
                  {t("close")}
                </DialogClose>
                <Button type="submit" data-testid="test-routing">
                  {t("test_routing")}
                </Button>
              </DialogFooter>
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

function SingleForm({ form, appUrl, Page, enrichedWithUserProfileForm }: SingleFormComponentProps) {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const [newFormDialogState, setNewFormDialogState] = useState<NewFormDialogState>(null);
  const [isTestPreviewOpen, setIsTestPreviewOpen] = useState(false);
  const [skipFirstUpdate, setSkipFirstUpdate] = useState(true);
  const [showInfoLostDialog, setShowInfoLostDialog] = useState(false);
  const hookForm = useFormContext<RoutingFormWithResponseCount>();

  useEffect(() => {
    //  The first time a tab is opened, the hookForm copies the form data (saved version, from the backend),
    // and then it is considered the source of truth.

    // There are two events we need to overwrite the hookForm data with the form data coming from the server.

    // 1 - When we change the edited form.

    // 2 - When the form is saved elsewhere (such as in another browser tab)

    // In the second case. We skipped the first execution of useEffect to differentiate a tab change from a form change,
    // because each time a tab changes, a new component is created and another useEffect is executed.
    // An update from the form always occurs after the first useEffect execution.
    if (Object.keys(hookForm.getValues()).length === 0 || hookForm.getValues().id !== form.id) {
      hookForm.reset(form);
    }

    if (skipFirstUpdate) {
      setSkipFirstUpdate(false);
    } else {
      hookForm.reset(form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const sendUpdatesTo = hookForm.watch("settings.sendUpdatesTo", []) as number[];
  const sendToAll = hookForm.watch("settings.sendToAll", false) as boolean;
  const mutation = trpc.viewer.appRoutingForms.formMutation.useMutation({
    onSuccess() {
      showToast(t("form_updated_successfully"), "success");
    },
    onError(e) {
      if (e.message) {
        showToast(e.message, "error");
        return;
      }
      showToast(`Something went wrong`, "error");
    },
    onSettled() {
      utils.viewer.appRoutingForms.formQuery.invalidate({ id: form.id });
    },
  });
  const connectedForms = form.connectedForms;

  const uptoDateForm = {
    ...hookForm.getValues(),
    routes: hookForm.watch("routes"),
    user: enrichedWithUserProfileForm.user,
    team: enrichedWithUserProfileForm.team,
    nonOrgUsername: enrichedWithUserProfileForm.nonOrgUsername,
    nonOrgTeamslug: enrichedWithUserProfileForm.nonOrgTeamslug,
    userOrigin: enrichedWithUserProfileForm.userOrigin,
    teamOrigin: enrichedWithUserProfileForm.teamOrigin,
  } as UptoDateForm;

  return (
    <>
      <Form
        form={hookForm}
        handleSubmit={(data) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          mutation.mutate({
            ...data,
          });
        }}>
        <FormActionsProvider
          appUrl={appUrl}
          newFormDialogState={newFormDialogState}
          setNewFormDialogState={setNewFormDialogState}>
          <ShellMain
            heading={
              <div className="flex">
                <div>{form.name}</div>
                {form.team && (
                  <Badge className="ml-4 mt-1" variant="gray">
                    {form.team.name}
                  </Badge>
                )}
              </div>
            }
            subtitle={form.description || ""}
            backPath={`${appUrl}/forms`}
            CTA={<Actions form={form} mutation={mutation} />}>
            <div className="-mx-4 mt-4 px-4 sm:px-6 md:-mx-8 md:mt-0 md:px-8">
              <div className="flex flex-col items-center items-baseline md:flex-row md:items-start">
                <div className="lg:min-w-72 lg:max-w-72 md:max-w-56 mb-6 w-full md:mr-6">
                  <TextField
                    type="text"
                    containerClassName="mb-6"
                    placeholder={t("title")}
                    {...hookForm.register("name")}
                  />
                  <TextAreaField
                    rows={3}
                    id="description"
                    data-testid="description"
                    placeholder={t("form_description_placeholder")}
                    {...hookForm.register("description")}
                    defaultValue={form.description || ""}
                  />

                  <div className="mt-6">
                    {form.teamId ? (
                      <div className="flex flex-col">
                        <span className="text-emphasis mb-3 block text-sm font-medium leading-none">
                          {t("routing_forms_send_email_to")}
                        </span>
                        <AddMembersWithSwitch
                          data-testid="routing-form-select-members"
                          teamId={form.teamId}
                          teamMembers={form.teamMembers.map((member) => ({
                            value: member.id.toString(),
                            label: member.name || member.email,
                            avatar: member.avatarUrl || "",
                            email: member.email,
                            isFixed: true,
                            defaultScheduleId: member.defaultScheduleId,
                          }))}
                          value={sendUpdatesTo.map((userId) => ({
                            isFixed: true,
                            userId: userId,
                            priority: 2,
                            weight: 100,
                            scheduleId: 1,
                          }))}
                          onChange={(value) => {
                            hookForm.setValue(
                              "settings.sendUpdatesTo",
                              value.map((teamMember) => teamMember.userId),
                              { shouldDirty: true }
                            );
                            hookForm.setValue("settings.emailOwnerOnSubmission", false, {
                              shouldDirty: true,
                            });
                          }}
                          assignAllTeamMembers={sendToAll}
                          setAssignAllTeamMembers={(value) => {
                            hookForm.setValue("settings.sendToAll", !!value, { shouldDirty: true });
                          }}
                          automaticAddAllEnabled={true}
                          isFixed={true}
                          onActive={() => {
                            hookForm.setValue(
                              "settings.sendUpdatesTo",
                              form.teamMembers.map((teamMember) => teamMember.id),
                              { shouldDirty: true }
                            );
                            hookForm.setValue("settings.emailOwnerOnSubmission", false, {
                              shouldDirty: true,
                            });
                          }}
                          placeholder={t("select_members")}
                          containerClassName="!px-0 !pb-0 !pt-0"
                        />
                      </div>
                    ) : (
                      <Controller
                        name="settings.emailOwnerOnSubmission"
                        control={hookForm.control}
                        render={({ field: { value, onChange } }) => {
                          return (
                            <SettingsToggle
                              title={t("routing_forms_send_email_owner")}
                              description={t("routing_forms_send_email_owner_description")}
                              checked={value}
                              onCheckedChange={(val) => {
                                onChange(val);
                                hookForm.unregister("settings.sendUpdatesTo");
                              }}
                            />
                          );
                        }}
                      />
                    )}
                  </div>

                  {form.routers.length ? (
                    <div className="mt-6">
                      <div className="text-emphasis mb-2 block text-sm font-semibold leading-none ">
                        {t("routers")}
                      </div>
                      <p className="text-default -mt-1 text-xs leading-normal">
                        {t("modifications_in_fields_warning")}
                      </p>
                      <div className="flex">
                        {form.routers.map((router) => {
                          return (
                            <div key={router.id} className="mr-2">
                              <Link href={`${appUrl}/route-builder/${router.id}`}>
                                <Badge variant="gray">{router.name}</Badge>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {connectedForms?.length ? (
                    <div className="mt-6">
                      <div className="text-emphasis mb-2 block text-sm font-semibold leading-none ">
                        {t("connected_forms")}
                      </div>
                      <p className="text-default -mt-1 text-xs leading-normal">
                        {t("form_modifications_warning")}
                      </p>
                      <div className="flex">
                        {connectedForms.map((router) => {
                          return (
                            <div key={router.id} className="mr-2">
                              <Link href={`${appUrl}/route-builder/${router.id}`}>
                                <Badge variant="default">{router.name}</Badge>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex gap-2">
                    <Button
                      color="secondary"
                      data-testid="test-preview"
                      onClick={() => setIsTestPreviewOpen(true)}>
                      {t("test_preview")}
                    </Button>
                    {IS_CALCOM && (
                      <Tooltip content={t("contact_our_support_team")} side="right">
                        <Button
                          target="_blank"
                          color="minimal"
                          href={`https://i.cal.com/support/routing-support-session?email=${encodeURIComponent(
                            user?.email ?? ""
                          )}&name=${encodeURIComponent(user?.name ?? "")}&form=${encodeURIComponent(
                            form.id
                          )}`}>
                          {t("need_help")}
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                  {form.routes?.every(isFallbackRoute) && (
                    <Alert
                      className="mt-6 !bg-orange-100 font-semibold text-orange-900"
                      iconClassName="!text-orange-900"
                      severity="neutral"
                      title={t("no_routes_defined")}
                    />
                  )}
                  {!form._count?.responses && (
                    <>
                      <Alert
                        className="mt-2 px-4 py-3"
                        severity="neutral"
                        title={t("no_responses_yet")}
                        CustomIcon="message-circle"
                      />
                    </>
                  )}
                </div>
                <div className="border-subtle bg-muted w-full rounded-md border p-8">
                  <RoutingNavBar
                    appUrl={appUrl}
                    form={form}
                    hookForm={hookForm}
                    setShowInfoLostDialog={setShowInfoLostDialog}
                  />
                  <Page hookForm={hookForm} form={form} appUrl={appUrl} />
                </div>
              </div>
            </div>
          </ShellMain>
        </FormActionsProvider>
      </Form>
      {showInfoLostDialog && (
        <InfoLostWarningDialog
          goToRoute={`${appUrl}/route-builder/${form?.id}`}
          isOpenInfoLostDialog={showInfoLostDialog}
          setIsOpenInfoLostDialog={setShowInfoLostDialog}
        />
      )}
      <TestFormDialog
        form={uptoDateForm}
        isTestPreviewOpen={isTestPreviewOpen}
        setIsTestPreviewOpen={setIsTestPreviewOpen}
      />
    </>
  );
}

export default function SingleFormWrapper({ form: _form, ...props }: SingleFormComponentProps) {
  const { data: form, isPending } = trpc.viewer.appRoutingForms.formQuery.useQuery(
    { id: _form.id },
    {
      initialData: _form,
      trpc: {},
    }
  );
  const { t } = useLocale();

  if (isPending) {
    // It shouldn't be possible because we are passing the data from SSR to it as initialData. So, no need for skeleton here
    return null;
  }

  if (!form) {
    throw new Error(t("something_went_wrong"));
  }
  return (
    <LicenseRequired>
      <SingleForm form={form} {...props} />
    </LicenseRequired>
  );
}

export { getServerSidePropsForSingleFormView };
