"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { SingleFormComponentProps } from "../types/shared";
import type { RoutingFormWithResponseCount } from "../types/types";
import type { NewFormDialogState } from "./FormActions";
import { FormActionsProvider } from "./FormActions";
import { InfoLostWarningDialog } from "./InfoLostWarningDialog";
import { Header } from "./_components/Header";
import { TestFormRenderer, type UptoDateForm } from "./_components/TestForm";
import { getServerSidePropsForSingleFormView } from "./getServerSidePropsSingleForm";

/**
 * It has the the ongoing changes in the form along with enrichedWithUserProfileForm specific data.
 * So, it can be used to test the form in the test preview dialog without saving the changes even.
 */
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
          <div className="flex h-full min-h-screen w-full flex-col">
            <Header
              routingForm={form}
              isSaving={mutation.isPending}
              appUrl={appUrl}
              setShowInfoLostDialog={setShowInfoLostDialog}
              setIsTestPreviewOpen={setIsTestPreviewOpen}
            />
            <div className="bg-default flex flex-1">
              <div className="mx-auto w-full max-w-4xl">
                <Page hookForm={hookForm} form={form} appUrl={appUrl} />
              </div>
              <div className="mx-auto w-full max-w-2xl">
                <TestFormRenderer
                  form={testForm}
                  isTestPreviewOpen={isTestPreviewOpen}
                  setIsTestPreviewOpen={setIsTestPreviewOpen}
                />
              </div>
            </div>
          </div>
        </FormActionsProvider>
      </Form>
      {showInfoLostDialog && (
        <InfoLostWarningDialog
          goToRoute={`${appUrl}/route-builder/${form?.id}`}
          isOpenInfoLostDialog={showInfoLostDialog}
          setIsOpenInfoLostDialog={setShowInfoLostDialog}
        />
      )}
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
