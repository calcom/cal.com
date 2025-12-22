"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Toaster } from "sonner";

import type { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import type { WorkflowPermissions } from "@calcom/features/workflows/repositories/WorkflowPermissionsRepository";
import { SENDER_ID } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { WorkflowStep } from "@calcom/prisma/client";
import type { TimeUnit, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { Form, Input } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import LicenseRequired from "../../common/components/LicenseRequired";
import { DeleteDialog } from "../components/DeleteDialog";
import SkeletonLoader from "../components/SkeletonLoaderEdit";
import WorkflowDetailsPage from "../components/WorkflowDetailsPage";
import {
  isSMSAction,
  isSMSOrWhatsappAction,
  isCalAIAction,
  isFormTrigger,
} from "../lib/actionHelperFunctions";
import { formSchema } from "../lib/schema";
import { getTranslatedText, translateVariablesToEnglish } from "../lib/variableTranslations";

export type FormValues = {
  name: string;
  activeOn: Option[];
  steps: (WorkflowStep & {
    senderName: string | null;
    agentId?: string | null;
    inboundAgentId?: string | null;
  })[];
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  selectAll: boolean;
};

type PageProps = {
  workflow: number;
  workflowData?: Awaited<ReturnType<typeof WorkflowRepository.getById>>;
  verifiedNumbers?: Awaited<ReturnType<typeof WorkflowRepository.getVerifiedNumbers>>;
  verifiedEmails?: Awaited<ReturnType<typeof WorkflowRepository.getVerifiedEmails>>;
};

function WorkflowPage({
  workflow: workflowId,
  workflowData: workflowDataProp,
  verifiedNumbers: verifiedNumbersProp,
  verifiedEmails: verifiedEmailsProp,
}: PageProps) {
  const { t, i18n } = useLocale();
  const session = useSession();

  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false);
  const [isMixedEventType, setIsMixedEventType] = useState(false); //for old event types before team workflows existed
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const searchParams = useSearchParams();

  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });

  const utils = trpc.useUtils();

  const watchedTrigger = useWatch({
    control: form.control,
    name: "trigger",
  });

  const userQuery = useMeQuery();
  const user = userQuery.data;

  const {
    data: workflowData,
    isError: _isError,
    error,
    isPending: _isPendingWorkflow,
  } = trpc.viewer.workflows.get.useQuery(
    { id: +workflowId },
    {
      enabled: workflowDataProp ? false : !!workflowId,
    }
  );

  const workflow = workflowDataProp || workflowData;
  const isPendingWorkflow = workflowDataProp ? false : _isPendingWorkflow;
  const isError = workflowDataProp ? false : _isError;

  const { data: verifiedNumbersData } = trpc.viewer.workflows.getVerifiedNumbers.useQuery(
    { teamId: workflow?.team?.id },
    {
      enabled: verifiedNumbersProp ? false : !!workflow?.id,
    }
  );
  const verifiedNumbers = verifiedNumbersProp || verifiedNumbersData;

  const { data: verifiedEmailsData } = trpc.viewer.workflows.getVerifiedEmails.useQuery(
    {
      teamId: workflow?.team?.id,
    },
    { enabled: !verifiedEmailsProp }
  );
  const verifiedEmails = verifiedEmailsProp || verifiedEmailsData;

  const isOrg = workflow?.team?.isOrganization ?? false;

  const teamId = workflow?.teamId ?? undefined;

  const { data, isPending: isPendingEventTypes } = trpc.viewer.eventTypes.getActiveOnOptions.useQuery(
    { teamId, isOrg },
    { enabled: !isPendingWorkflow }
  );

  const teamOptions = data?.teamOptions ?? [];
  const routingFormOptions = data?.routingFormOptions ?? [];

  let allEventTypeOptions = data?.eventTypeOptions ?? [];
  const distinctEventTypes = new Set();

  if (!teamId && isMixedEventType) {
    allEventTypeOptions = [...allEventTypeOptions, ...selectedOptions];
    allEventTypeOptions = allEventTypeOptions.filter((option) => {
      const duplicate = distinctEventTypes.has(option.value);
      distinctEventTypes.add(option.value);
      return !duplicate;
    });
  }

  const hasPermissions = (w: typeof workflow): w is RouterOutputs["viewer"]["workflows"]["get"] => {
    return w !== null && w !== undefined && "permissions" in w;
  };

  const permissions: WorkflowPermissions =
    workflow && hasPermissions(workflow)
      ? workflow?.permissions
      : {
          canUpdate: !teamId,
          canView: !teamId,
          canDelete: !teamId,
          readOnly: !!teamId,
        };

  // Watch for form name changes
  const watchedName = form.watch("name");

  // Handler functions for editable name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };

  const handleNameSubmit = () => {
    form.setValue("name", nameValue);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      form.setValue("name", nameValue);
      setIsEditingName(false);
    } else if (e.key === "Escape") {
      setNameValue(watchedName || "");
      setIsEditingName(false);
    }
  };

  const isPending = isPendingWorkflow || isPendingEventTypes;

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, [isPending]);

  useEffect(() => {
    if (!isPending) {
      if (hasPermissions(workflow)) {
        setFormData(workflow);
      } else if (workflow) {
        const workflowWithDefaults = {
          ...workflow,
          permissions: {
            canUpdate: false,
            canView: false,
            canDelete: false,
            canManage: false,
            readOnly: true,
          },
          readOnly: true,
        } as RouterOutputs["viewer"]["workflows"]["get"];
        setFormData(workflowWithDefaults);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  // Update nameValue when workflow changes
  useEffect(() => {
    if (workflow?.name) {
      setNameValue(workflow.name);
    }
  }, [workflow?.name]);

  function setFormData(workflowData: RouterOutputs["viewer"]["workflows"]["get"] | undefined) {
    if (workflowData) {
      if (workflowData.userId && workflowData.activeOn.find((active) => !!active.eventType.teamId)) {
        setIsMixedEventType(true);
      }
      let activeOn;

      if (workflowData.isActiveOnAll) {
        activeOn = isOrg
          ? teamOptions
          : isFormTrigger(workflowData.trigger)
          ? routingFormOptions
          : allEventTypeOptions;
      } else {
        if (isOrg) {
          activeOn = workflowData.activeOnTeams.flatMap((active) => {
            return {
              value: String(active.team.id) || "",
              label: active.team.slug || "",
            };
          });
          setSelectedOptions(activeOn || []);
        } else if (isFormTrigger(workflowData.trigger)) {
          activeOn = workflowData.activeOnRoutingForms?.flatMap((active) => {
            return {
              value: String(active.routingForm.id) || "",
              label: active.routingForm.name || "",
            };
          });
          setSelectedOptions(activeOn || []);
        } else {
          setSelectedOptions(
            workflowData.activeOn?.flatMap((active) => {
              if (workflowData.teamId && active.eventType.parentId) return [];
              return {
                value: String(active.eventType.id),
                label: active.eventType.title,
              };
            }) || []
          );
          activeOn = workflowData.activeOn
            ? workflowData.activeOn.map((active) => ({
                value: active.eventType.id.toString(),
                label: active.eventType.slug,
              }))
            : undefined;
        }
      }
      //translate dynamic variables into local language
      const steps = workflowData.steps?.map((step) => {
        const updatedStep = {
          ...step,
          senderName: step.sender,
          sender: isSMSAction(step.action) ? step.sender : SENDER_ID,
        };
        if (step.reminderBody) {
          updatedStep.reminderBody = getTranslatedText(step.reminderBody || "", {
            locale: i18n.language,
            t,
          });
        }
        if (step.emailSubject) {
          updatedStep.emailSubject = getTranslatedText(step.emailSubject || "", {
            locale: i18n.language,
            t,
          });
        }
        return updatedStep;
      });

      form.setValue("name", workflowData.name);
      form.setValue("steps", steps);
      form.setValue("trigger", workflowData.trigger);
      form.setValue("time", workflowData.time || undefined);
      form.setValue("timeUnit", workflowData.timeUnit || undefined);
      form.setValue("activeOn", activeOn || []);
      form.setValue("selectAll", workflowData.isActiveOnAll ?? false);
      setNameValue(workflowData.name);
      setIsAllDataLoaded(true);
    }
  }

  const updateMutation = trpc.viewer.workflows.update.useMutation({
    onSuccess: async ({ workflow }) => {
      utils.viewer.workflows.get.setData({ id: +workflow.id }, workflow);
      setFormData(workflow);

      const autoCreateAgent = searchParams?.get("autoCreateAgent");
      if (!autoCreateAgent) {
        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
      }
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const validateAndSubmitWorkflow = async (values: FormValues): Promise<void> => {
    let isEmpty = false;
    let isVerified = true;

    values.steps.forEach((step) => {
      const strippedHtml = step.reminderBody?.replace(/<[^>]+>/g, "") || "";

      const isBodyEmpty =
        !isSMSOrWhatsappAction(step.action) && !isCalAIAction(step.action) && strippedHtml.length <= 1;

      if (isBodyEmpty) {
        form.setError(`steps.${step.stepNumber - 1}.reminderBody`, {
          type: "custom",
          message: t("fill_this_field"),
        });
      }

      if (step.reminderBody) {
        step.reminderBody = translateVariablesToEnglish(step.reminderBody, {
          locale: i18n.language,
          t,
        });
      }
      if (step.emailSubject) {
        step.emailSubject = translateVariablesToEnglish(step.emailSubject, {
          locale: i18n.language,
          t,
        });
      }
      isEmpty = !isEmpty ? isBodyEmpty : isEmpty;

      //check if phone number is verified
      if (
        (step.action === WorkflowActions.SMS_NUMBER || step.action === WorkflowActions.WHATSAPP_NUMBER) &&
        !verifiedNumbers?.find((verifiedNumber) => verifiedNumber.phoneNumber === step.sendTo)
      ) {
        isVerified = false;

        form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
          type: "custom",
          message: t("not_verified"),
        });
      }

      if (
        step.action === WorkflowActions.EMAIL_ADDRESS &&
        !verifiedEmails?.find((verifiedEmail) => verifiedEmail === step.sendTo)
      ) {
        isVerified = false;

        form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
          type: "custom",
          message: t("not_verified"),
        });
      }
    });

    if (!isEmpty && isVerified) {
      let activeOnEventTypeOrTeamIds: number[] = [];
      let activeOnRoutingFormIds: string[] = [];
      if (isOrg || !isFormTrigger(values.trigger)) {
        activeOnEventTypeOrTeamIds = values.activeOn
          .filter((option) => option.value !== "all")
          .map((option) => {
            return parseInt(option.value, 10);
          });
      } else {
        // Form triggers, activeOn contains routing form IDs (strings)
        activeOnRoutingFormIds = values.activeOn
          .filter((option) => option.value !== "all")
          .map((option) => option.value);
      }

      await updateMutation.mutateAsync({
        id: workflowId,
        name: values.name,
        activeOnEventTypeIds: activeOnEventTypeOrTeamIds,
        activeOnRoutingFormIds,
        steps: values.steps,
        trigger: values.trigger,
        time: values.time || null,
        timeUnit: values.timeUnit || null,
        isActiveOnAll: values.selectAll || false,
      });

      utils.viewer.workflows.getVerifiedNumbers.invalidate();
    } else {
      const validationErrors: string[] = [];

      if (isEmpty) {
        validationErrors.push(t("workflow_validation_empty_fields"));
      }

      if (!isVerified) {
        validationErrors.push(t("workflow_validation_unverified_contacts"));
      }

      throw new Error(`${t("workflow_validation_failed")}: ${validationErrors.join("; ")}`);
    }
  };

  const handleSaveWorkflow = async (): Promise<void> => {
    const values = form.getValues();
    await validateAndSubmitWorkflow(values);
  };

  return session.data ? (
    <LicenseRequired>
      <Form
        form={form}
        handleSubmit={async (values) => {
          await validateAndSubmitWorkflow(values);
        }}>
        <div className="flex h-full min-h-screen w-full flex-col">
          <div className="bg-default border-muted flex w-full items-center justify-between border-b px-4 py-2">
            <div className="border-muted flex items-center gap-2">
              <Button
                color="secondary"
                size="sm"
                variant="icon"
                StartIcon="arrow-left"
                href="/workflows"
                data-testid="go-back-button"
              />
              <div className="flex min-w-0 items-center leading-none">
                <span className="text-subtle min-w-content text-sm font-semibold leading-none">
                  {t("workflows")}
                </span>
                <span className="text-subtle mx-1 text-sm font-semibold leading-none">/</span>
                {isEditingName ? (
                  <Input
                    {...form.register("name")}
                    data-testid="workflow-name"
                    onChange={handleNameChange}
                    onKeyDown={handleNameKeyDown}
                    onBlur={handleNameSubmit}
                    className="text-default focus:shadow-outline-gray-focused h-auto w-full whitespace-nowrap border-none p-1 text-sm font-semibold leading-none focus:ring-0"
                    autoFocus
                  />
                ) : (
                  <div className="group flex items-center gap-1">
                    <span
                      className="text-default hover:bg-cal-muted min-w-[100px] cursor-pointer truncate whitespace-nowrap rounded p-1 text-sm font-semibold leading-none"
                      onClick={() => setIsEditingName(true)}>
                      {watchedName ? watchedName : isPending ? t("loading") : t("untitled")}
                    </span>
                    <Button
                      variant="icon"
                      color="minimal"
                      data-testid="edit-workflow-name-button"
                      disabled={isPending}
                      onClick={() => setIsEditingName(true)}
                      CustomStartIcon={
                        <Icon name="pencil" className="text-subtle group-hover:text-default h-3 w-3" />
                      }>
                      <span className="sr-only">{t("edit")}</span>
                    </Button>
                  </div>
                )}
              </div>
              {workflow && workflow.team && (
                <Badge className="ml-4 mt-1" variant="gray">
                  {workflow.team.name}
                </Badge>
              )}
              {permissions.readOnly && (
                <Badge className="ml-4 mt-1" variant="gray">
                  {t("readonly")}
                </Badge>
              )}
            </div>

            <div className="border-muted flex justify-end gap-2">
              <Tooltip sideOffset={4} content={t("delete")} side="bottom">
                <Button
                  color="destructive"
                  type="button"
                  StartIcon="trash-2"
                  data-testid="delete-button"
                  onClick={() => {
                    setDeleteDialogOpen(true);
                  }}
                  disabled={!permissions.canDelete}
                />
              </Tooltip>
              <Button
                loading={updateMutation.isPending}
                disabled={permissions.readOnly || updateMutation.isPending}
                data-testid="save-workflow"
                type="submit"
                color="primary">
                {t("save")}
              </Button>
            </div>
          </div>
          <div className="bg-default min-h-screen w-full px-2 sm:p-0">
            <div className="mx-auto my-8 max-w-4xl">
              {!isError ? (
                <>
                  {isAllDataLoaded && user ? (
                    <>
                      <WorkflowDetailsPage
                        form={form}
                        workflowId={+workflowId}
                        user={user}
                        selectedOptions={selectedOptions}
                        setSelectedOptions={setSelectedOptions}
                        teamId={workflow ? workflow.teamId || undefined : undefined}
                        isOrg={isOrg}
                        allOptions={
                          isOrg
                            ? teamOptions
                            : isFormTrigger(watchedTrigger)
                            ? routingFormOptions
                            : allEventTypeOptions
                        }
                        eventTypeOptions={allEventTypeOptions}
                        onSaveWorkflow={handleSaveWorkflow}
                        permissions={permissions}
                      />
                    </>
                  ) : (
                    <SkeletonLoader />
                  )}
                </>
              ) : (
                <Alert severity="error" title={t("something_went_wrong")} message={error?.message ?? ""} />
              )}
            </div>
          </div>
        </div>
      </Form>
      <DeleteDialog
        isOpenDialog={deleteDialogOpen}
        setIsOpenDialog={setDeleteDialogOpen}
        workflowId={workflowId}
        additionalFunction={async () => {
          // Navigate back to workflows list after deletion
          window.location.href = "/workflows";
        }}
      />
      <Toaster position="bottom-right" />
    </LicenseRequired>
  ) : (
    <></>
  );
}

export default WorkflowPage;
