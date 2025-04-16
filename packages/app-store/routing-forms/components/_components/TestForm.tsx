"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { useState, useMemo } from "react";
import FormInputFields from "routing-forms/components/FormInputFields";
import { getAbsoluteEventTypeRedirectUrl } from "routing-forms/getEventTypeRedirectUrl";
import { RoutingPages } from "routing-forms/lib/RoutingPages";
import { findMatchingRoute } from "routing-forms/lib/processRoute";
import type { RoutingForm, FormResponse, NonRouterRoute } from "routing-forms/types/types";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { Brand } from "@calcom/types/utils";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import { TRPCClientError } from "@trpc/react-query";

import type { SingleFormComponentProps } from "../../types/shared";
import { ResultsView as Results } from "./ResultSection";
import type { MembersMatchResultType } from "./TeamMembersMatchResult";
import { TeamMembersMatchResult } from "./TeamMembersMatchResult";

export type UptoDateForm = Brand<
  NonNullable<SingleFormComponentProps["enrichedWithUserProfileForm"]>,
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
      <div className="px-1">
        {form && <FormInputFields form={form} response={response} setResponse={setResponse} />}
      </div>
      {!renderFooter ? (
        <div className="mt-4">
          <Button onClick={onSubmit} disabled={!areRequiredFieldsFilled}>
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
  showAllData = true,
  renderFooter,
}: {
  form: UptoDateForm | RoutingForm;
  supportsTeamMembersMatchingLogic: boolean;
  showAllData?: boolean;
  renderFooter?: (onClose: () => void, onSubmit: () => void, isValid: boolean) => React.ReactNode;
}) => {
  const { t } = useLocale();
  const [response, setResponse] = useState<FormResponse>({});
  const [chosenRoute, setChosenRoute] = useState<NonRouterRoute | null>(null);
  const [eventTypeUrlWithoutParams, setEventTypeUrlWithoutParams] = useState("");
  const searchParams = useCompatSearchParams();
  const [membersMatchResult, setMembersMatchResult] = useState<MembersMatchResultType | null>(null);
  const [showResults, setShowResults] = useState(false);

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
    let eventTypeRedirectUrl: string | null = null;

    if (route?.action?.type === "eventTypeRedirectUrl") {
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
    setShowResults(true);

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

  const onClose = () => {
    setChosenRoute(null);
    setResponse({});
    setShowResults(false);
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

  return (
    <div>
      <AnimatePresence mode="wait">
        {!showResults ? (
          <FormView
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
        ) : (
          <Results
            showAllData={showAllData}
            renderTestResult={renderTestResult}
            onBack={() => setShowResults(false)}
            membersMatchResult={membersMatchResult}
          />
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
        <div className="border-muted bg-muted h-full border-l p-6">
          <TestForm form={testForm} supportsTeamMembersMatchingLogic={isSubTeamForm} />
        </div>
      );
    }
  }

  return (
    <Dialog open={isTestPreviewOpen} onOpenChange={setIsTestPreviewOpen}>
      <DialogContent size="md" enableOverflow>
        <DialogHeader title={t("test_routing_form")} subtitle={t("test_preview_description")} />
        <div>
          <TestForm
            form={testForm}
            supportsTeamMembersMatchingLogic={isSubTeamForm}
            renderFooter={(onClose, onSubmit, isValid) => (
              <DialogFooter>
                <Button onClick={onClose} color="secondary">
                  {t("close")}
                </Button>
                <Button onClick={onSubmit} disabled={!isValid}>
                  {t("submit")}
                </Button>
              </DialogFooter>
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
