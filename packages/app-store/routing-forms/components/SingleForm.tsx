import type { App_RoutingForms_Form, Team } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import AddMembersWithSwitch from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { ShellMain } from "@calcom/features/shell/Shell";
import useApp from "@calcom/lib/hooks/useApp";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenuSeparator,
  Form,
  Meta,
  SettingsToggle,
  showToast,
  TextAreaField,
  TextField,
  Tooltip,
  VerticalDivider,
} from "@calcom/ui";

import { getAbsoluteEventTypeRedirectUrl } from "../getEventTypeRedirectUrl";
import { RoutingPages } from "../lib/RoutingPages";
import { isFallbackRoute } from "../lib/isFallbackRoute";
import { findMatchingRoute } from "../lib/processRoute";
import type { FormResponse, NonRouterRoute, SerializableForm } from "../types/types";
import { FormAction, FormActionsDropdown, FormActionsProvider } from "./FormActions";
import FormInputFields from "./FormInputFields";
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
  const { data: typeformApp } = useApp("typeform");

  return (
    <div className="flex items-center">
      <div className="hidden items-center sm:inline-flex">
        <FormAction className="self-center" data-testid="toggle-form" action="toggle" routingForm={form} />
        <VerticalDivider />
      </div>
      <ButtonGroup combined containerProps={{ className: "hidden md:inline-flex items-center" }}>
        <Tooltip content={t("preview")}>
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
        />

        <Tooltip content="Download Responses">
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
        />
        {typeformApp?.isInstalled ? (
          <FormActionsDropdown>
            <FormAction
              data-testid="copy-redirect-url"
              routingForm={form}
              action="copyRedirectUrl"
              color="minimal"
              type="button"
              StartIcon="link">
              {t("Copy Typeform Redirect Url")}
            </FormAction>
          </FormActionsDropdown>
        ) : null}
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
          {typeformApp ? (
            <FormAction
              data-testid="copy-redirect-url"
              routingForm={form}
              action="copyRedirectUrl"
              color="minimal"
              type="button"
              StartIcon="link">
              {t("Copy Typeform Redirect Url")}
            </FormAction>
          ) : null}
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
  enrichedWithUserProfileForm?: inferSSRProps<
    typeof getServerSidePropsForSingleFormView
  >["enrichedWithUserProfileForm"];
};

function SingleForm({ form, appUrl, Page, enrichedWithUserProfileForm }: SingleFormComponentProps) {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const isTeamForm = !!form.teamId;
  const [isTestPreviewOpen, setIsTestPreviewOpen] = useState(false);
  const [response, setResponse] = useState<FormResponse>({});
  const [chosenRoute, setChosenRoute] = useState<NonRouterRoute | null>(null);
  const [skipFirstUpdate, setSkipFirstUpdate] = useState(true);
  const [eventTypeUrl, setEventTypeUrl] = useState("");
  const searchParams = useCompatSearchParams();
  const [teamMembersMatchingAttributeLogic, setTeamMembersMatchingAttributeLogic] = useState<
    | {
        id: number;
        name: string | null;
        email: string;
      }[]
    | null
  >([]);
  const findTeamMembersMatchingAttributeLogicMutation =
    trpc.viewer.appRoutingForms.findTeamMembersMatchingAttributeLogic.useMutation({
      onSuccess(data) {
        setTeamMembersMatchingAttributeLogic(data.result);
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

    if (route?.action?.type === "eventTypeRedirectUrl") {
      setEventTypeUrl(
        enrichedWithUserProfileForm
          ? getAbsoluteEventTypeRedirectUrl({
              eventTypeRedirectUrl: route.action.value,
              form: enrichedWithUserProfileForm,
              allURLSearchParams: new URLSearchParams(),
            })
          : ""
      );
    }

    setChosenRoute(route || null);

    if (!route) return;

    findTeamMembersMatchingAttributeLogicMutation.mutate({
      formId: form.id,
      response,
      routeId: route.id,
      isPreview: true,
      _enablePerf: searchParams.get("enablePerf") === "true",
    });
  }

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

  const testFormDialog = (() => {
    const testResult = chosenRoute ? (
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
                <a target="_blank" href={eventTypeUrl} rel="noreferrer" data-testid="test-routing-result">
                  {chosenRoute.action.value}
                </a>
              </span>
              {isTeamForm ? (
                <div>
                  <span>{t("matching_members")}:</span>{" "}
                  {!findTeamMembersMatchingAttributeLogicMutation.isPending ? (
                    <div>
                      {teamMembersMatchingAttributeLogic?.map((member) => member.email).join(", ") ||
                        t("no_matching_members")}
                    </div>
                  ) : (
                    <div>Loading...</div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    ) : null;

    return (
      <Dialog open={isTestPreviewOpen} onOpenChange={setIsTestPreviewOpen}>
        <DialogContent enableOverflow>
          <DialogHeader title={t("test_routing_form")} subtitle={t("test_preview_description")} />
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                testRouting();
              }}>
              <div className="px-1">
                {form && <FormInputFields form={form} response={response} setResponse={setResponse} />}
              </div>
              <div>{testResult}</div>
              <DialogFooter>
                <DialogClose
                  color="secondary"
                  onClick={() => {
                    setIsTestPreviewOpen(false);
                    setChosenRoute(null);
                    setResponse({});
                  }}>
                  {t("close")}
                </DialogClose>
                <Button type="submit" data-testid="test-routing">
                  {t("test_routing")}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    );
  })();

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
        <FormActionsProvider appUrl={appUrl}>
          <Meta title={form.name} description={form.description || ""} />
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
            backPath={`/${appUrl}/forms`}
            CTA={<Actions form={form} mutation={mutation} />}>
            <div className="-mx-4 mt-4 px-4 sm:px-6 md:-mx-8 md:mt-0 md:px-8">
              <div className="flex flex-col items-center items-baseline md:flex-row md:items-start">
                <div className="lg:min-w-72 lg:max-w-72 mb-6 md:mr-6">
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
                            weightAdjustment: 0,
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

                  <div className="mt-6">
                    <Button
                      color="secondary"
                      data-testid="test-preview"
                      onClick={() => setIsTestPreviewOpen(true)}>
                      {t("test_preview")}
                    </Button>
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
                  <RoutingNavBar appUrl={appUrl} form={form} />
                  <Page hookForm={hookForm} form={form} appUrl={appUrl} />
                </div>
              </div>
            </div>
          </ShellMain>
        </FormActionsProvider>
      </Form>
      {testFormDialog}
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
