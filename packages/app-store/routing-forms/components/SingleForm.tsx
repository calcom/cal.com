"use client";

import { triggerToast } from "@calid/features/ui/components/toast";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Form } from "@calcom/ui/components/form";

import type { SelectTeamDialogState } from "../../components/FormActions";
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

  // const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
  //   const queryString = searchParams?.toString() || "";

  //   const baseTabConfigs = [
  //     {
  //       name: "upcoming",
  //       path: "/bookings/upcoming",
  //       "data-testid": "upcoming",
  //     },
  //     {
  //       name: "unconfirmed",
  //       path: "/bookings/unconfirmed",
  //       "data-testid": "unconfirmed",
  //     },
  //     {
  //       name: "recurring",
  //       path: "/bookings/recurring",
  //       "data-testid": "recurring",
  //     },
  //     {
  //       name: "past",
  //       path: "/bookings/past",
  //       "data-testid": "past",
  //     },
  //     {
  //       name: "cancelled",
  //       path: "/bookings/cancelled",
  //       "data-testid": "cancelled",
  //     },
  //   ];

  //   return baseTabConfigs.map((tabConfig) => ({
  //     name: tabConfig.name,
  //     href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
  //     "data-testid": tabConfig["data-testid"],
  //   }));
  // }, [searchParams?.toString()]);

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
  const mutation = trpc.viewer.appRoutingForms.calid_formMutation.useMutation({
    onSuccess() {
      triggerToast(t("form_updated_successfully"), "success");
    },
    onError(e) {
      if (e.message) {
        triggerToast(e.message, "error");
        return;
      }
      triggerToast(`Something went wrong`, "error");
    },
    onSettled() {
      utils.viewer.appRoutingForms.calid_formQuery.invalidate({ id: form.id });
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

  const [selectTeamDialogState, setSelectTeamDialogState] = useState<SelectTeamDialogState>(null);

  return (
    <Shell>
      <>
        <Form form={hookForm} handleSubmit={handleSubmit}>
          <FormActionsProvider
            appUrl={appUrl}
            newFormDialogState={newFormDialogState}
            setNewFormDialogState={setNewFormDialogState}
            selectTeamDialogState={selectTeamDialogState}
            setSelectTeamDialogState={setSelectTeamDialogState}>
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
                  <motion.div layout className="w-full" transition={{ duration: 0.3, ease: "easeInOut" }}>
                    <Page uptoDateForm={uptoDateForm} hookForm={hookForm} form={form} appUrl={appUrl} />
                  </motion.div>
                ) : (
                  <div className="w-full px-2">
                    <Page uptoDateForm={uptoDateForm} hookForm={hookForm} form={form} appUrl={appUrl} />
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
    </Shell>
  );
}

export default function SingleFormWrapper({ form: _form, ...props }: SingleFormComponentProps) {
  const { data: form, isPending } = trpc.viewer.appRoutingForms.calid_formQuery.useQuery(
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
    // <LicenseRequired>
    <SingleForm form={form} {...props} />
    // </LicenseRequired>
  );
}
