"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { InfoLostWarningDialog } from "@calcom/app-store/routing-forms/components/InfoLostWarningDialog";
import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import classNames from "@calcom/ui/classNames";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { getServerSidePropsForSingleFormView } from "@lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";

import type { NewFormDialogState } from "./FormActions";
import { FormActionsProvider } from "./FormActions";
import { Header } from "./Header";
import type { UptoDateForm } from "./TestForm";
import { TestFormRenderer } from "./TestForm";

export type SingleFormComponentProps = {
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
  permissions: inferSSRProps<typeof getServerSidePropsForSingleFormView>["permissions"];
};

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
function SingleForm({
  form,
  appUrl,
  Page,
  enrichedWithUserProfileForm,
  permissions,
}: SingleFormComponentProps) {
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
          <div className="flex h-full min-h-screen w-full flex-col">
            <Header
              routingForm={form}
              isSaving={mutation.isPending}
              appUrl={appUrl}
              setShowInfoLostDialog={setShowInfoLostDialog}
              setIsTestPreviewOpen={setIsTestPreviewOpen}
              isTestPreviewOpen={isTestPreviewOpen}
              permissions={permissions}
            />
            <div
              className={classNames(
                "bg-default flex-1",
                isDesktop && "grid gap-8",
                isDesktop && isTestPreviewOpen && "grid-cols-[1fr_400px]",
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
