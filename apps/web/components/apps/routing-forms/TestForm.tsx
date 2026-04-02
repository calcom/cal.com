"use client";

import { ResultsView as Results } from "@calcom/app-store/routing-forms/components/_components/ResultSection";
import type { MembersMatchResultType } from "@calcom/app-store/routing-forms/components/_components/TeamMembersMatchResult";
import { TeamMembersMatchResult } from "@calcom/app-store/routing-forms/components/_components/TeamMembersMatchResult";
import FormInputFields from "@calcom/app-store/routing-forms/components/FormInputFields";
import { findMatchingRoute } from "@calcom/app-store/routing-forms/lib/processRoute";
import { substituteVariables } from "@calcom/app-store/routing-forms/lib/substituteVariables";
import type { FormResponse, NonRouterRoute, RoutingForm } from "@calcom/app-store/routing-forms/types/types";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import type { Brand } from "@calcom/types/utils";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import type { getServerSidePropsForSingleFormView } from "@lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import { TRPCClientError } from "@trpc/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

export type UptoDateForm = Brand<
  NonNullable<inferSSRProps<typeof getServerSidePropsForSingleFormView>["enrichedWithUserProfileForm"]>,
  "UptoDateForm"
>;

const FormView = ({
  form,
  response,
  setResponse,
  areRequiredFieldsFilled,
  onClose,
  onSubmit,
  renderFooter,
}: {
  form: UptoDateForm | RoutingForm;
  response: FormResponse;
  setResponse: Dispatch<SetStateAction<FormResponse>>;
  areRequiredFieldsFilled: boolean;
  onClose: () => void;
  onSubmit: () => void;
  renderFooter?: (onClose: () => void, onSubmit: () => void, isValid: boolean) => React.ReactNode;
}) => {
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
        }}>
        {form && <FormInputFields form={form} response={response} setResponse={setResponse} />}
      </form>
      {!renderFooter ? (
        <div className="mt-4">
          <Button onClick={onSubmit} disabled={!areRequiredFieldsFilled} data-testid="submit-button">
            {t("submit")}
          </Button>
        </div>
      ) : (
        renderFooter(onClose, onSubmit, areRequiredFieldsFilled)
      )}
    </motion.div>
  );
};

export const TestForm = ({
  form,
  supportsTeamMembersMatchingLogic,
  renderFooter,
  isDialog = false,
  onClose: onCloseProp,
  showRRData = false,
}: {
  form: UptoDateForm | RoutingForm;
  supportsTeamMembersMatchingLogic: boolean;
  renderFooter?: (onClose: () => void, onSubmit: () => void, isValid: boolean) => React.ReactNode;
  isDialog?: boolean;
  onClose?: () => void;
  showRRData?: boolean;
}) => {
  const { t } = useLocale();
  const [response, setResponse] = useState<FormResponse>({});
  const [chosenRoute, setChosenRoute] = useState<NonRouterRoute | null>(null);
  const searchParams = useCompatSearchParams();
  const [membersMatchResult, setMembersMatchResult] = useState<MembersMatchResultType | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [formKey, setFormKey] = useState<number>(0);

  const orgBranding = useOrgBranding();

  const embedLink = `forms/${form.id}`;
  const formLink = `${orgBranding?.fullDomain ?? WEBSITE_URL}/${embedLink}`;

  const areRequiredFieldsFilled = useMemo(() => {
    if (!form.fields) return true;

    const requiredFields = form.fields.filter((field) => field.required);
    if (!requiredFields.length) return true;

    return requiredFields.every((field) => {
      const fieldResponse = response[field.id];
      if (!fieldResponse) return false;

      const value = fieldResponse.value;
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== "";
    });
  }, [form.fields, response]);

  const resetMembersMatchResult = () => {
    setMembersMatchResult(null);
    setShowResults(false);
  };

  function testRouting() {
    const route = findMatchingRoute({ form, response });

    // Create a copy of the route with substituted variables for display
    let displayRoute = route;
    if (route && form.fields && route.action.type === "eventTypeRedirectUrl") {
      const substitutedUrl = substituteVariables(route.action.value, response, form.fields);
      displayRoute = {
        ...route,
        action: {
          ...route.action,
          value: substitutedUrl,
        },
      };
    }

    setChosenRoute(displayRoute || null);
    setShowResults(true);

    if (!route) return;

    // Custom Event Type Redirect URL has eventTypeId=0. Also, findTeamMembersMatchingAttributeLogicMutation can't work without eventTypeId
    if (supportsTeamMembersMatchingLogic && route.action.eventTypeId) {
      findTeamMembersMatchingAttributeLogicMutation.mutate({
        formId: form.id,
        response,
        route,
        isPreview: true,
        _enablePerf: searchParams.get("enablePerf") === "true",
      });
    }
  }

  const onClose = () => {
    setChosenRoute(null);
    setResponse({});
    setShowResults(false);
    onCloseProp?.();
  };

  function resetForm() {
    setChosenRoute(null);
    setResponse({});
    setShowResults(false);
    // This is a hack to force the form to reset RAQB doesnt seem to be resetting the form when the form is re-rendered
    setFormKey((prevKey) => prevKey + 1);
  }

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

  return (
    <div>
      <AnimatePresence mode="wait">
        {!showResults ? (
          <>
            {isDialog ? (
              <DialogHeader title={t("test_routing_form")} subtitle={t("test_preview_description")} />
            ) : !showRRData ? (
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-emphasis text-xl font-semibold">{t("preview")}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    color="secondary"
                    href={formLink}
                    target="_blank"
                    variant="icon"
                    StartIcon="external-link"
                    data-testid="open-form-in-new-tab"
                    size="sm">
                    <span className="sr-only">{t("open_in_new_tab")}</span>
                  </Button>
                  <Button
                    color="secondary"
                    onClick={resetForm}
                    variant="icon"
                    StartIcon="refresh-cw"
                    size="sm">
                    <span className="sr-only">{t("reset")}</span>
                  </Button>
                  <Button color="secondary" onClick={onClose} variant="icon" StartIcon="x" size="sm">
                    <span className="sr-only">{t("close")}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <></>
            )}
            <FormView
              key={formKey}
              form={form}
              response={response}
              setResponse={setResponse}
              areRequiredFieldsFilled={areRequiredFieldsFilled}
              onClose={onClose}
              onSubmit={() => {
                resetMembersMatchResult();
                testRouting();
              }}
              renderFooter={renderFooter}
            />
          </>
        ) : (
          <>
            {isDialog ? (
              <DialogHeader title={t("test_routing_form")} subtitle={t("test_preview_description")} />
            ) : !showRRData ? (
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-emphasis text-xl font-semibold">{t("results")}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    color="secondary"
                    href={formLink}
                    target="_blank"
                    variant="icon"
                    StartIcon="external-link"
                    size="sm">
                    <span className="sr-only">{t("open_in_new_tab")}</span>
                  </Button>
                  <Button
                    color="secondary"
                    onClick={resetForm}
                    variant="icon"
                    StartIcon="refresh-cw"
                    size="sm">
                    <span className="sr-only">{t("reset")}</span>
                  </Button>
                  <Button
                    color="secondary"
                    onClick={onClose}
                    variant="icon"
                    StartIcon="x"
                    size="sm"
                    data-testid="close-results-button">
                    <span className="sr-only">{t("close")}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <></>
            )}

            {showRRData ? (
              <>
                <Button color="secondary" onClick={resetForm} variant="icon" StartIcon="refresh-cw">
                  {t("reset_form")}
                </Button>
                <TeamMembersMatchResult membersMatchResult={membersMatchResult} />
              </>
            ) : (
              <Results
                chosenRoute={chosenRoute}
                supportsTeamMembersMatchingLogic={supportsTeamMembersMatchingLogic}
                membersMatchResult={membersMatchResult}
                isPending={findTeamMembersMatchingAttributeLogicMutation.isPending}
              />
            )}

            {isDialog && (
              <DialogFooter>
                <Button onClick={onClose} color="secondary">
                  {t("back")}
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TestFormRenderer = ({
  testForm,
  isTestPreviewOpen,
  setIsTestPreviewOpen,
  isMobile,
}: {
  testForm: UptoDateForm;
  isTestPreviewOpen: boolean;
  setIsTestPreviewOpen: (value: boolean) => void;
  isMobile: boolean;
}) => {
  const { t } = useLocale();
  const isSubTeamForm = !!testForm.team?.parentId;

  if (!isMobile) {
    if (isTestPreviewOpen) {
      return (
        <div className="border-muted bg-cal-muted h-full border-l p-6">
          <TestForm
            form={testForm}
            supportsTeamMembersMatchingLogic={isSubTeamForm}
            onClose={() => setIsTestPreviewOpen(false)}
          />
        </div>
      );
    }
  }

  return (
    <Dialog open={isTestPreviewOpen} onOpenChange={setIsTestPreviewOpen}>
      <DialogContent size="md" enableOverflow>
        <TestForm
          isDialog
          form={testForm}
          supportsTeamMembersMatchingLogic={isSubTeamForm}
          renderFooter={(onClose, onSubmit, isValid) => (
            <DialogFooter>
              <Button
                onClick={() => {
                  onClose();
                  setIsTestPreviewOpen(false);
                }}
                color="secondary">
                {t("close")}
              </Button>
              <Button onClick={onSubmit} disabled={!isValid}>
                {t("submit")}
              </Button>
            </DialogFooter>
          )}
        />
      </DialogContent>
    </Dialog>
  );
};
