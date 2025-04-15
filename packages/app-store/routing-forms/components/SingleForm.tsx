"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { SingleFormComponentProps } from "../types/shared";
import type { RoutingFormWithResponseCount } from "../types/types";
import type { NewFormDialogState } from "./FormActions";
import { FormActionsProvider } from "./FormActions";
import { InfoLostWarningDialog } from "./InfoLostWarningDialog";
import { Header } from "./_components/Header";
import { TestFormRenderer, type UptoDateForm } from "./_components/TestForm";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;
type BreakpointState = Record<Breakpoint, boolean>;

function useBreakPoints() {
  const [breakpoints, setBreakpoints] = useState<BreakpointState>({
    sm: false,
    md: false,
    lg: false,
    xl: false,
    "2xl": false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      setBreakpoints({
        sm: width >= BREAKPOINTS.sm,
        md: width >= BREAKPOINTS.md,
        lg: width >= BREAKPOINTS.lg,
        xl: width >= BREAKPOINTS.xl,
        "2xl": width >= BREAKPOINTS["2xl"],
      });
    };

    // Initial check
    updateBreakpoints();

    // Add resize listener
    window.addEventListener("resize", updateBreakpoints);
    return () => window.removeEventListener("resize", updateBreakpoints);
  }, []);

  return {
    ...breakpoints,
    // Convenience properties
    isMobile: !breakpoints.md,
    isTablet: breakpoints.md && !breakpoints.lg,
    isDesktop: breakpoints.lg,
  };
}

/**
 * It has the the ongoing changes in the form along with enrichedWithUserProfileForm specific data.
 * So, it can be used to test the form in the test preview dialog without saving the changes even.
 */
function SingleForm({ form, appUrl, Page, enrichedWithUserProfileForm }: SingleFormComponentProps) {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const [newFormDialogState, setNewFormDialogState] = useState<NewFormDialogState>(null);
  const [isTestPreviewOpen, setIsTestPreviewOpen] = useState(false);
  const [skipFirstUpdate, setSkipFirstUpdate] = useState(true);
  const [showInfoLostDialog, setShowInfoLostDialog] = useState(false);
  const hookForm = useFormContext<RoutingFormWithResponseCount>();
  const { isDesktop } = useBreakPoints();

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

  const handleSubmit = (data: RoutingFormWithResponseCount) => {
    mutation.mutate({
      ...data,
    });
  };

  return (
    <>
      <Form form={hookForm} handleSubmit={handleSubmit}>
        <FormActionsProvider
          appUrl={appUrl}
          newFormDialogState={newFormDialogState}
          setNewFormDialogState={setNewFormDialogState}>
<<<<<<< HEAD
          <div className="flex h-full min-h-screen w-full flex-col">
            <Header
              routingForm={form}
              isSaving={mutation.isPending}
              appUrl={appUrl}
              setShowInfoLostDialog={setShowInfoLostDialog}
              setIsTestPreviewOpen={setIsTestPreviewOpen}
              isTestPreviewOpen={isTestPreviewOpen}
            />
            <div
              className={classNames(
                "bg-default flex-1",
                isDesktop && "grid gap-8",
                isDesktop && isTestPreviewOpen && "grid-cols-[1fr,400px]",
                isDesktop && !isTestPreviewOpen && "grid-cols-1",
                !isDesktop && "flex flex-col"
              )}>
              {isDesktop ? (
                <motion.div
                  layout
                  className="mx-auto w-full max-w-4xl px-2 lg:px-4 xl:px-0"
                  transition={{ duration: 0.3, ease: "easeInOut" }}>
                  <Page hookForm={hookForm} form={form} appUrl={appUrl} />
                </motion.div>
              ) : (
                <div className="mx-auto w-full max-w-4xl px-2">
                  <Page hookForm={hookForm} form={form} appUrl={appUrl} />
=======
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
            <div className="flex flex-col items-center items-baseline px-3 md:flex-row md:items-start md:p-0">
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
                          isOrganizer: false,
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
>>>>>>> 019ce09865 (fixed types, no type-check errors now)
                </div>
              )}
              <AnimatePresence>
                {isTestPreviewOpen && isDesktop ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}>
                    <TestFormRenderer
                      isMobile={!isDesktop}
                      testForm={uptoDateForm}
                      isTestPreviewOpen={isTestPreviewOpen}
                      setIsTestPreviewOpen={setIsTestPreviewOpen}
                    />
                  </motion.div>
                ) : isTestPreviewOpen ? (
                  <div>
                    <TestFormRenderer
                      isMobile={!isDesktop}
                      testForm={uptoDateForm}
                      isTestPreviewOpen={isTestPreviewOpen}
                      setIsTestPreviewOpen={setIsTestPreviewOpen}
                    />
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </FormActionsProvider>
        {showInfoLostDialog && (
          <InfoLostWarningDialog
            handleSubmit={() => {
              mutation.mutate({
                ...hookForm.getValues(),
              });
            }}
            goToRoute={`${appUrl}/route-builder/${form?.id}`}
            isOpenInfoLostDialog={showInfoLostDialog}
            setIsOpenInfoLostDialog={setShowInfoLostDialog}
          />
        )}
      </Form>
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
