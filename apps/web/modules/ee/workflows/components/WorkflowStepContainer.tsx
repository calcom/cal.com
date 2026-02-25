import { type TFunction } from "i18next";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import "react-phone-number-input/style.css";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import {
  getTemplateBodyForAction,
  shouldScheduleEmailReminder,
  isSMSOrWhatsappAction,
  isSMSAction,
  isWhatsappAction,
  isFormTrigger,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { DYNAMIC_TEXT_VARIABLES } from "@calcom/features/ee/workflows/lib/constants";
import {
  getWorkflowTemplateOptions,
  getWorkflowTriggerOptions,
} from "@calcom/features/ee/workflows/lib/getOptions";
import emailRatingTemplate from "@calcom/features/ee/workflows/lib/reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "@calcom/features/ee/workflows/lib/reminders/templates/emailReminderTemplate";
import type { FormValues } from "@calcom/features/ee/workflows/lib/types";
import PhoneInput from "@calcom/web/components/phone-input";
import "@calcom/features/ee/workflows/style/styles.css";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { WorkflowStep } from "@calcom/prisma/client";
import {
  MembershipRole,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge, InfoBadge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@calcom/ui/components/dialog";
import { AddVariablesDropdown } from "@calcom/ui/components/editor";
import { Editor } from "@calcom/ui/components/editor";
import { CheckboxField } from "@calcom/ui/components/form";
import { EmailField } from "@calcom/ui/components/form";
import { TextArea } from "@calcom/ui/components/form";
import { Input } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { MultiSelectCheckbox } from "@calcom/ui/components/form";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { CircleHelpIcon, InfoIcon } from "@coss/ui/icons";
import {
  useHasPaidPlan,
  useHasActiveTeamPlan,
} from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

import { TimeTimeUnitInput } from "./TimeTimeUnitInput";

type User = RouterOutputs["viewer"]["me"]["get"];

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  user: User;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
  teamId?: number;
  readOnly: boolean;
  // Props for trigger section
  selectedOptions?: Option[];
  setSelectedOptions?: Dispatch<SetStateAction<Option[]>>;
  isOrganization?: boolean;
  allOptions?: Option[];
  eventTypeOptions?: Option[];
  onSaveWorkflow?: () => Promise<void>;
  setIsDeleteStepDialogOpen?: Dispatch<SetStateAction<boolean>>;
  isDeleteStepDialogOpen?: boolean;
  actionOptions: {
    label: string;
    value: WorkflowActions;
    needsCredits: boolean;
    creditsTeamId?: number;
    isOrganization: boolean;
    needsTeamsUpgrade?: boolean;
  }[];
  updateTemplate: boolean;
  setUpdateTemplate: Dispatch<SetStateAction<boolean>>;
};

const getTimeSectionText = (trigger: WorkflowTriggerEvents, t: TFunction) => {
  const triggerMap: Partial<Record<WorkflowTriggerEvents, string>> = {
    [WorkflowTriggerEvents.AFTER_EVENT]: "how_long_after",
    [WorkflowTriggerEvents.BEFORE_EVENT]: "how_long_before",
    [WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: "how_long_after_hosts_no_show",
    [WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: "how_long_after_guests_no_show",
    [WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT]: "how_long_after_form_submitted_no_event",
  };
  return triggerMap[trigger] ? t(triggerMap[trigger]) : null;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();

  const {
    step,
    form,
    reload,
    setReload,
    teamId,
    selectedOptions,
    setSelectedOptions,
    isOrganization,
    allOptions,
    isDeleteStepDialogOpen,
    setIsDeleteStepDialogOpen,
    actionOptions,
    updateTemplate,
    setUpdateTemplate,
  } = props;
  const { data: _verifiedNumbers } = trpc.viewer.workflows.getVerifiedNumbers.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  const { data: userTeams } = trpc.viewer.teams.list.useQuery(
    {},
    { enabled: !teamId }
  );

  const creditsTeamId = userTeams?.find(
    (team) => team.accepted && (team.role === MembershipRole.ADMIN || team.role === MembershipRole.OWNER)
  )?.id;

  const { hasPaidPlan } = useHasPaidPlan();
  const { hasActiveTeamPlan, isTrial } = useHasActiveTeamPlan();
  const planState = { hasPaidPlan, hasActiveTeamPlan, isTrial };

  const { data: _verifiedEmails } = trpc.viewer.workflows.getVerifiedEmails.useQuery({ teamId });

  const timeFormat = getTimeFormatStringFromUserTimeFormat(props.user.timeFormat);

  const verifiedNumbers =
    _verifiedNumbers?.map((number) => number.phoneNumber) || [];
  const verifiedEmails = _verifiedEmails || [];
  const [isAdditionalInputsDialogOpen, setIsAdditionalInputsDialogOpen] =
    useState(false);

  const [verificationCode, setVerificationCode] = useState("");

  const action = step?.action;
  const requirePhoneNumber =
    WorkflowActions.SMS_NUMBER === action || WorkflowActions.WHATSAPP_NUMBER === action;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(requirePhoneNumber);

  const [firstRender, setFirstRender] = useState(true);

  const senderNeeded =
    step?.action === WorkflowActions.SMS_NUMBER || step?.action === WorkflowActions.SMS_ATTENDEE;

  const [_isSenderIsNeeded, setIsSenderIsNeeded] = useState(senderNeeded);

  const [isEmailAddressNeeded, setIsEmailAddressNeeded] = useState(
    step?.action === WorkflowActions.EMAIL_ADDRESS ? true : false
  );

  const [isEmailSubjectNeeded, setIsEmailSubjectNeeded] = useState(
    step?.action === WorkflowActions.EMAIL_ATTENDEE ||
      step?.action === WorkflowActions.EMAIL_HOST ||
      step?.action === WorkflowActions.EMAIL_ADDRESS
      ? true
      : false
  );

  const trigger = useWatch({
    control: form.control,
    name: "trigger",
  });

  const [timeSectionText, setTimeSectionText] = useState(
    getTimeSectionText(trigger, t)
  );

  const triggerOptions = getWorkflowTriggerOptions(t, planState);
  const templateOptions = getWorkflowTemplateOptions(t, step?.action, planState, trigger);

  const steps = useWatch({
    control: form.control,
    name: "steps",
  });

  const hasEmailToHostAction = steps.some((s) => s.action === WorkflowActions.EMAIL_HOST);
  const hasWhatsappAction = steps.some((s) => isWhatsappAction(s.action));

  const disallowFormTriggers = hasEmailToHostAction || hasWhatsappAction;

  const filteredTriggerOptions = triggerOptions.filter(
    (option) => !(isFormTrigger(option.value) && disallowFormTriggers)
  );

  const { ref: emailSubjectFormRef, ...restEmailSubjectForm } = step
    ? form.register(`steps.${step.stepNumber - 1}.emailSubject`)
    : { ref: null, name: "" };

  const refEmailSubject = useRef<HTMLTextAreaElement | null>(null);

  const getNumberVerificationStatus = () =>
    !!step &&
    !!verifiedNumbers.find(
      (number: string) => number === form.getValues(`steps.${step.stepNumber - 1}.sendTo`)
    );

  const getEmailVerificationStatus = () =>
    !!step &&
    !!verifiedEmails.find((email: string) => email === form.getValues(`steps.${step.stepNumber - 1}.sendTo`));

  const [numberVerified, setNumberVerified] = useState(getNumberVerificationStatus());
  const [emailVerified, setEmailVerified] = useState(getEmailVerificationStatus());

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only run when verifiedNumbers.length changes
  useEffect(() => setNumberVerified(getNumberVerificationStatus()), [verifiedNumbers.length]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only run when verifiedEmails.length changes
  useEffect(() => setEmailVerified(getEmailVerificationStatus()), [verifiedEmails.length]);

  const addVariableEmailSubject = (variable: string) => {
    if (step) {
      const currentEmailSubject = refEmailSubject?.current?.value || "";
      const cursorPosition = refEmailSubject?.current?.selectionStart || currentEmailSubject.length;
      const subjectWithAddedVariable = `${currentEmailSubject.substring(0, cursorPosition)}{${variable
        .toUpperCase()
        .replace(/ /g, "_")}}${currentEmailSubject.substring(cursorPosition)}`;
      form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectWithAddedVariable, {
        shouldDirty: true,
      });
    }
  };

  const sendVerificationCodeMutation = trpc.viewer.workflows.sendVerificationCode.useMutation({
    onSuccess: async () => {
      showToast(t("verification_code_sent"), "success");
    },
    onError: async (error) => {
      showToast(error.message, "error");
    },
  });

  const verifyPhoneNumberMutation = trpc.viewer.workflows.verifyPhoneNumber.useMutation({
    onSuccess: async (isVerified) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");
      setNumberVerified(isVerified);
      if (
        step &&
        form?.formState?.errors?.steps &&
        form.formState.errors.steps[step.stepNumber - 1]?.sendTo &&
        isVerified
      ) {
        form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
      }

      utils.viewer.workflows.getVerifiedNumbers.invalidate();
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setNumberVerified(false);
      }
    },
  });

  const sendEmailVerificationCodeMutation = trpc.viewer.auth.sendVerifyEmailCode.useMutation({
    onSuccess() {
      showToast(t("email_sent"), "success");
    },
    onError: () => {
      showToast(t("email_not_sent"), "error");
    },
  });

  const verifyEmailCodeMutation = trpc.viewer.workflows.verifyEmailCode.useMutation({
    onSuccess: (isVerified) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");
      setEmailVerified(isVerified);
      if (
        step &&
        form?.formState?.errors?.steps &&
        form.formState.errors.steps[step.stepNumber - 1]?.sendTo &&
        isVerified
      ) {
        form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
      }
      utils.viewer.workflows.getVerifiedEmails.invalidate();
    },
    onError: (err) => {
      if (err.message === "invalid_code") {
        showToast(t("code_provided_invalid"), "error");
        setEmailVerified(false);
      }
    },
  });
  /* const testActionMutation = trpc.viewer.workflows.testAction.useMutation({
    onSuccess: async () => {
      showToast(t("notification_sent"), "success");
    },
    onError: (err) => {
      let message = t("unexpected_error_try_again");
      if (err instanceof TRPCClientError) {
        if (err.message === "rate-limit-exceeded") {
          message = t("rate_limit_exceeded");
        } else {
          message = err.message;
        }
      }
      if (err instanceof HttpError) {
        message = `${err.statusCode}: ${err.message}`;
      }
      showToast(message, "error");
    },
  }); */

  //trigger
  if (!step) {
    const triggerString = t(`${trigger.toLowerCase()}_trigger`);

    const selectedTrigger = {
      label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1),
      value: trigger,
    };

    return (
      <>
        <div className="mb-3">
          <Label className="text-default text-sm leading-none">{t("when")}</Label>
          <Controller
            name="trigger"
            control={form.control}
            render={() => {
              return (
                <Select
                  isSearchable={false}
                  innerClassNames={{ valueContainer: "font-medium" }}
                  className="text-sm font-medium"
                  id="trigger-select"
                  isDisabled={props.readOnly}
                  onChange={(val) => {
                    if (val) {
                      const triggerValue = val.value as WorkflowTriggerEvents;
                      const currentTrigger = form.getValues("trigger") as WorkflowTriggerEvents;
                      const isCurrentFormTrigger = isFormTrigger(currentTrigger);
                      const isNewFormTrigger = isFormTrigger(triggerValue);

                      form.setValue("trigger", triggerValue, { shouldDirty: true });

                      // Reset activeOn when switching between form and non-form triggers
                      if (isCurrentFormTrigger !== isNewFormTrigger) {
                        form.setValue("activeOn", [], { shouldDirty: true });
                        if (setSelectedOptions) {
                          setSelectedOptions([]);
                        }
                        form.setValue("selectAll", false, { shouldDirty: true });
                      }

                      const newTimeSectionText = getTimeSectionText(triggerValue, t);
                      if (newTimeSectionText) {
                        setTimeSectionText(newTimeSectionText);
                        if (
                          triggerValue === WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
                          triggerValue === WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
                        ) {
                          form.setValue("time", 5, { shouldDirty: true });
                          form.setValue("timeUnit", TimeUnit.MINUTE, { shouldDirty: true });
                        } else {
                          form.setValue("time", 24, { shouldDirty: true });
                          form.setValue("timeUnit", TimeUnit.HOUR, { shouldDirty: true });
                        }
                      } else {
                        setTimeSectionText(null);
                        form.unregister("time");
                        form.unregister("timeUnit");
                      }
                      if (isFormTrigger(triggerValue)) {
                        const steps = form.getValues("steps");
                        if (steps?.length) {
                          const updatedSteps = steps.map((step) =>
                            step.template === WorkflowTemplates.CUSTOM
                              ? step
                              : {
                                  ...step,
                                  reminderBody: " ",
                                  emailSubject: " ",
                                  template: WorkflowTemplates.CUSTOM,
                                }
                          );
                          form.setValue("steps", updatedSteps, { shouldDirty: true });
                          setUpdateTemplate(!updateTemplate);
                        }
                      }
                    }
                  }}
                  defaultValue={selectedTrigger}
                  options={filteredTriggerOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                    needsTeamsUpgrade: option.needsTeamsUpgrade,
                    upgradeTeamsBadgeProps: option.upgradeTeamsBadgeProps,
                  }))}
                  isOptionDisabled={(option: { label: string; value: string; needsTeamsUpgrade?: boolean }) =>
                    !!option.needsTeamsUpgrade
                  }
                />
              );
            }}
          />
        </div>
        <div>
          {!!timeSectionText && (
            <div className="mb-3 mt-3">
              <Label className="text-default mb-0">{timeSectionText}</Label>
              <TimeTimeUnitInput disabled={props.readOnly} />
            </div>
          )}
          {/* Event Type/Team Selection */}
          {selectedOptions && setSelectedOptions && allOptions && (
            <div className={classNames(!!timeSectionText && "mb-3")}>
              {isOrganization ? (
                <div className="text-default flex items-center gap-2">
                  <Label>{t("which_team_apply")}</Label>
                  <div className="mb-2">
                    <InfoBadge content={t("team_select_info")} />
                  </div>
                </div>
              ) : (
                <Label>
                  {isFormTrigger(trigger) ? t("which_routing_form_apply") : t("which_event_type_apply")}
                </Label>
              )}
              <Controller
                name="activeOn"
                control={form.control}
                render={() => {
                  return (
                    <MultiSelectCheckbox
                      options={allOptions}
                      isDisabled={props.readOnly || form.getValues("selectAll")}
                      className="w-full"
                      setSelected={setSelectedOptions}
                      selected={form.getValues("selectAll") ? allOptions : selectedOptions}
                      setValue={(s: Option[]) => {
                        form.setValue("activeOn", s, { shouldDirty: true });
                      }}
                      countText={
                        isOrganization
                          ? "count_team"
                          : isFormTrigger(form.getValues("trigger"))
                            ? "nr_routing_form"
                            : "nr_event_type"
                      }
                    />
                  );
                }}
              />
              <div className="mt-1">
                  <Controller
                    name="selectAll"
                    render={({ field: { value, onChange } }) => (
                      <CheckboxField
                        description={
                          isOrganization
                            ? t("apply_to_all_teams")
                            : isFormTrigger(form.getValues("trigger"))
                              ? t("apply_to_all_routing_forms")
                              : t("apply_to_all_event_types")
                        }
                        disabled={props.readOnly}
                        descriptionClassName="ml-0"
                        onChange={(e) => {
                          onChange(e);
                          if (e.target.value) {
                            setSelectedOptions(allOptions);
                            form.setValue("activeOn", allOptions, { shouldDirty: true });
                          }
                        }}
                        checked={value}
                      />
                    )}
                  />
                </div>
            </div>
          )}
          {!!timeSectionText && steps.some((s) => isSMSAction(s.action)) && (
            <div className="mt-1 flex text-gray-500">
              <InfoIcon className="mr-1 mt-0.5 h-4 w-4" />
              <p className="text-sm">{t("testing_sms_workflow_info_message")}</p>
            </div>
          )}
        </div>
      </>
    );
  }

  if (step && step.action) {
    const actionString = t(`${step.action.toLowerCase()}_action`);

    const selectedAction = {
      label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
      value: step.action,
      needsCredits: isSMSOrWhatsappAction(step.action),
      creditsTeamId: teamId ?? creditsTeamId,
      isOrganization: props.isOrganization,
    };

    const selectedTemplate = {
      label: t(`${step.template.toLowerCase()}`),
      value: step.template,
      needsTeamsUpgrade: false,
    };

    const canRequirePhoneNumber = (workflowStep: string) => {
      return (
        WorkflowActions.SMS_ATTENDEE === workflowStep || WorkflowActions.WHATSAPP_ATTENDEE === workflowStep
      );
    };

    return (
      <>
        <div>
          <div>
            <Label>{t("do_this")}</Label>
            <Controller
              name={`steps.${step.stepNumber - 1}.action`}
              control={form.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    className="text-sm"
                    isDisabled={props.readOnly}
                    onChange={(val) => {
                      if (val) {
                        const oldValue = form.getValues(`steps.${step.stepNumber - 1}.action`);

                        const template = getTemplateBodyForAction({
                          action: val.value,
                          locale: i18n.language,
                          t,
                          template: WorkflowTemplates.REMINDER,
                          timeFormat,
                        });

                        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, template);

                        const setNumberRequiredConfigs = (
                          phoneNumberIsNeeded: boolean,
                          senderNeeded = true
                        ) => {
                          setIsSenderIsNeeded(senderNeeded);
                          setIsEmailAddressNeeded(false);
                          setIsPhoneNumberNeeded(phoneNumberIsNeeded);
                          setNumberVerified(getNumberVerificationStatus());
                        };

                        if (isSMSAction(val.value)) {
                          setNumberRequiredConfigs(val.value === WorkflowActions.SMS_NUMBER);
                          // email action changes to sms action
                          if (!isSMSAction(oldValue)) {
                            form.setValue(`steps.${step.stepNumber - 1}.sender`, SENDER_ID);
                          }

                          setIsEmailSubjectNeeded(false);
                        } else if (isWhatsappAction(val.value)) {
                          setNumberRequiredConfigs(val.value === WorkflowActions.WHATSAPP_NUMBER, false);

                          if (!isWhatsappAction(oldValue)) {
                            form.setValue(`steps.${step.stepNumber - 1}.sender`, "");
                          }

                          setIsEmailSubjectNeeded(false);
                        } else {
                          setIsPhoneNumberNeeded(false);
                          setIsSenderIsNeeded(false);
                          setIsEmailAddressNeeded(val.value === WorkflowActions.EMAIL_ADDRESS);
                          setIsEmailSubjectNeeded(true);
                        }

                        if (
                          val.value !== WorkflowActions.EMAIL_ATTENDEE &&
                          val.value !== WorkflowActions.SMS_ATTENDEE
                        ) {
                          form.setValue(`steps.${step.stepNumber - 1}.autoTranslateEnabled`, false, {
                            shouldDirty: true,
                          });
                        }

                        form.setValue(`steps.${step.stepNumber - 1}.sendTo`, null);
                        form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
                        form.setValue(`steps.${step.stepNumber - 1}.action`, val.value, {
                          shouldDirty: true,
                        });
                        setUpdateTemplate(!updateTemplate);
                      }
                    }}
                    defaultValue={selectedAction}
                    options={actionOptions.map((option) => ({
                      ...option,
                      creditsTeamId: teamId ?? creditsTeamId,
                    }))}
                  />
                );
              }}
            />
          </div>
          {!isWhatsappAction(
            form.getValues(`steps.${step.stepNumber - 1}.action`)
          ) && (
              <div>
                {_isSenderIsNeeded ? (
                  <>
                    <div className="pt-4">
                      <div className="flex items-center">
                        <Label>{t("sender_id")}</Label>
                      </div>
                      <Input
                        type="text"
                        placeholder={SENDER_ID}
                        disabled={props.readOnly}
                        maxLength={11}
                        {...form.register(`steps.${step.stepNumber - 1}.sender`)}
                      />
                      <div className="mt-1.5 flex items-center gap-1">
                        <InfoIcon size={10} className="text-gray-500" />
                        <div className="text-subtle text-xs">{t("sender_id_info")}</div>
                      </div>
                    </div>
                    {form.formState.errors.steps &&
                      form.formState?.errors?.steps[step.stepNumber - 1]?.sender && (
                        <p className="text-error mt-1 text-xs">{t("sender_id_error_message")}</p>
                      )}
                  </>
                ) : (
                  <>
                    <div className="pt-4">
                      <Label>{t("sender_name")}</Label>
                      <Input
                        type="text"
                        disabled={props.readOnly}
                        placeholder={SENDER_NAME}
                        {...form.register(`steps.${step.stepNumber - 1}.senderName`)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          {isPhoneNumberNeeded && (
            <div className="bg-cal-muted mt-2 rounded-md p-4 pt-0">
              <Label className="pt-4">{t("custom_phone_number")}</Label>
              <div className="block sm:flex">
                <Controller
                  name={`steps.${step.stepNumber - 1}.sendTo`}
                  render={({ field: { value, onChange } }) => (
                    <PhoneInput
                      placeholder={t("phone_number")}
                      id={`steps.${step.stepNumber - 1}.sendTo`}
                      className="min-w-fit sm:rounded-r-none sm:rounded-bl-md sm:rounded-tl-md"
                      required
                      disabled={props.readOnly}
                      value={value}
                      onChange={(val) => {
                        const isAlreadyVerified = !!verifiedNumbers
                          ?.concat([])
                          .find((number) => number.replace(/\s/g, "") === val?.replace(/\s/g, ""));
                        setNumberVerified(isAlreadyVerified);
                        onChange(val);
                      }}
                    />
                  )}
                />
                <Button
                  color="secondary"
                  disabled={numberVerified || props.readOnly || false}
                  className={classNames(
                    "-ml-[3px] h-[40px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none",
                    numberVerified ? "hidden" : "mt-3 sm:mt-0"
                  )}
                  onClick={() =>
                    sendVerificationCodeMutation.mutate({
                      phoneNumber: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "",
                    })
                  }>
                  {t("send_code")}
                </Button>
              </div>

              {form.formState.errors.steps && form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                <p className="text-error mt-1 text-xs">
                  {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                </p>
              )}
              {numberVerified ? (
                <div className="mt-1">
                  <Badge variant="green">{t("number_verified")}</Badge>
                </div>
              ) : (
                !props.readOnly && (
                  <>
                    <div className="mt-6 flex w-full flex-col">
                      <Label className="">{t("verification_code")}</Label>
                      <div className="flex w-full items-center">
                        <TextField
                          containerClassName="w-full"
                          className="h-8 rounded-xl"
                          placeholder={t("code")}
                          disabled={props.readOnly}
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value);
                          }}
                          required
                        />
                        <Button
                          color="secondary"
                          size="sm"
                          className="ml-2 min-w-fit rounded-[10px]"
                          disabled={verifyPhoneNumberMutation.isPending || props.readOnly}
                          onClick={() => {
                            verifyPhoneNumberMutation.mutate({
                              phoneNumber: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "",
                              code: verificationCode,
                              teamId,
                            });
                          }}>
                          {t("verify")}
                        </Button>
                      </div>
                    </div>
                    {form.formState.errors.steps &&
                      form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                        <p className="text-error mt-1 text-xs">
                          {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                        </p>
                      )}
                  </>
                )
              )}
            </div>
          )}
          {canRequirePhoneNumber(
            form.getValues(`steps.${step.stepNumber - 1}.action`)
          ) && (
              <div className="mt-2">
                <Controller
                  name={`steps.${step.stepNumber - 1}.numberRequired`}
                  control={form.control}
                  render={() => (
                    <CheckboxField
                      disabled={props.readOnly}
                      defaultChecked={form.getValues(`steps.${step.stepNumber - 1}.numberRequired`) || false}
                      description={t("make_phone_number_required")}
                      descriptionClassName="ml-0"
                      onChange={(e) =>
                        form.setValue(`steps.${step.stepNumber - 1}.numberRequired`, e.target.checked, {
                          shouldDirty: true,
                        })
                      }
                    />
                  )}
                />
              </div>
            )}
          {isEmailAddressNeeded && (
              <div className="bg-cal-muted border-muted mt-5 rounded-2xl border p-4">
                <Label>{t("email_address")}</Label>
                <div className="block items-center gap-2 sm:flex">
                  <Controller
                    name={`steps.${step.stepNumber - 1}.sendTo`}
                    render={({ field: { value, onChange } }) => (
                      <EmailField
                        required
                        containerClassName="w-full"
                        className="h-8 min-w-fit"
                        placeholder={t("email_address")}
                        value={value}
                        disabled={props.readOnly}
                        onChange={(val) => {
                          const isAlreadyVerified = !!verifiedEmails
                            ?.concat([])
                            .find((email) => email === val.target.value);
                          setEmailVerified(isAlreadyVerified);
                          onChange(val);
                        }}
                      />
                    )}
                  />
                  <Button
                    color="secondary"
                    size="sm"
                    disabled={emailVerified || props.readOnly || false}
                    className={classNames(
                      "min-w-fit text-sm font-medium",
                      emailVerified ? "hidden" : "mt-3 sm:mt-0"
                    )}
                    onClick={() => {
                      const email =
                        form.getValues(`steps.${step.stepNumber - 1}.sendTo`) ||
                        "";
                      sendEmailVerificationCodeMutation.mutate({
                        email,
                        isVerifyingEmail: true,
                        language: i18n.language || "en",
                      });
                    }}
                  >
                    {t("send_code")}
                  </Button>
                </div>
                {form.formState.errors.steps &&
                  form.formState?.errors?.steps[step.stepNumber - 1]
                    ?.sendTo && (
                    <p className="text-error mt-1 text-xs">
                      {form.formState?.errors?.steps[step.stepNumber - 1]
                        ?.sendTo?.message || ""}
                    </p>
                  )}
                {emailVerified ? (
                  <div className="mt-1">
                    <Badge variant="green">{t("email_verified")}</Badge>
                  </div>
                ) : (
                  !props.readOnly && (
                    <>
                      <div className="mt-3 flex w-full flex-col">
                        <Label className="">{t("verification_code")}</Label>
                        <div className="flex w-full items-center">
                          <TextField
                            containerClassName="w-full"
                            className="h-8 rounded-xl"
                            placeholder={t("code")}
                            disabled={props.readOnly}
                            value={verificationCode}
                            onChange={(e) => {
                              setVerificationCode(e.target.value);
                            }}
                            required
                          />
                          <Button
                            color="secondary"
                            size="sm"
                            className="ml-2 min-w-fit rounded-[10px]"
                            disabled={verifyEmailCodeMutation.isPending || props.readOnly}
                            onClick={() => {
                              verifyEmailCodeMutation.mutate({
                                code: verificationCode,
                                email: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) || "",
                                teamId,
                              });
                            }}>
                            {t("verify")}
                          </Button>
                        </div>
                      </div>
                      {form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                          <p className="text-error mt-1 text-xs">
                            {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                          </p>
                        )}
                    </>
                  )
                )}
              </div>
            )}
          <div className="mt-3">
            <Label>{t("message_template")}</Label>
            <Controller
              name={`steps.${step.stepNumber - 1}.template`}
              control={form.control}
              render={({ field }) => {
                return (
                  <Select
                    isSearchable={false}
                    className="text-sm"
                    isDisabled={props.readOnly}
                    onChange={(val) => {
                      if (val) {
                        const action = form.getValues(`steps.${step.stepNumber - 1}.action`);
                        const value = val.value as WorkflowTemplates;

                        const template = getTemplateBodyForAction({
                          action,
                          locale: i18n.language,
                          t,
                          template: value ?? WorkflowTemplates.REMINDER,
                          timeFormat,
                        });

                        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, template);

                        if (shouldScheduleEmailReminder(action)) {
                          if (value === WorkflowTemplates.REMINDER) {
                            form.setValue(
                              `steps.${step.stepNumber - 1}.emailSubject`,
                              emailReminderTemplate({
                                isEditingMode: true,
                                locale: i18n.language,
                                t,
                                action,
                                timeFormat,
                              }).emailSubject
                            );
                          } else if (value === WorkflowTemplates.RATING) {
                            form.setValue(
                              `steps.${step.stepNumber - 1}.emailSubject`,
                              emailRatingTemplate({
                                isEditingMode: true,
                                locale: i18n.language,
                                action,
                                t,
                                timeFormat,
                              }).emailSubject
                            );
                          }
                        }
                        field.onChange(value);
                        form.setValue(`steps.${step.stepNumber - 1}.template`, value, {
                          shouldDirty: true,
                        });
                        setUpdateTemplate(!updateTemplate);
                      }
                    }}
                    defaultValue={selectedTemplate}
                    value={selectedTemplate}
                    options={templateOptions.map((option) => {
                      const needsTeamsUpgrade =
                        option.needsTeamsUpgrade &&
                        !isSMSAction(form.getValues(`steps.${step.stepNumber - 1}.action`));
                      return {
                        label: option.label,
                        value: option.value,
                        needsTeamsUpgrade,
                        upgradeTeamsBadgeProps: needsTeamsUpgrade
                          ? option.upgradeTeamsBadgeProps
                          : undefined,
                      };
                    })}
                    isOptionDisabled={(option: {
                      label: string;
                      value: string;
                      needsTeamsUpgrade: boolean;
                    }) => option.needsTeamsUpgrade}
                  />
                );
              }}
            />
          </div>
          <div className="bg-cal-muted border-muted mt-3 rounded-2xl border py-1 px-3">
              {isEmailSubjectNeeded && (
                <div className="mb-6">
                  <div className="flex items-center">
                    <Label
                      className={classNames(
                        "flex-none",
                        props.readOnly || isFormTrigger(trigger) ? "mb-2" : "mb-0"
                      )}>
                      {t("email_subject")}
                    </Label>
                    {!props.readOnly && !isFormTrigger(trigger) && (
                      <div className="grow text-right">
                        <AddVariablesDropdown
                          addVariable={addVariableEmailSubject}
                          variables={DYNAMIC_TEXT_VARIABLES}
                        />
                      </div>
                    )}
                  </div>
                  <TextArea
                    ref={(e) => {
                      emailSubjectFormRef?.(e);
                      refEmailSubject.current = e;
                    }}
                    rows={2}
                    disabled={props.readOnly || !hasActiveTeamPlan}
                    className="my-0 focus:ring-transparent"
                    required
                    {...restEmailSubjectForm}
                  />
                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject && (
                      <p className="text-error mt-1 text-xs">
                        {form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject?.message || ""}
                      </p>
                    )}
                </div>
              )}
              <div className="mb-2 flex items-center pb-1">
                <Label className="mb-0 flex-none">
                  {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                </Label>
              </div>
              <Editor
                getText={() => props.form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || ""}
                setText={(text: string) => {
                  props.form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, text, {
                    shouldDirty: true,
                  });
                  props.form.clearErrors();
                }}
                variables={!isFormTrigger(trigger) ? DYNAMIC_TEXT_VARIABLES : undefined}
                addVariableButtonTop={isSMSAction(step.action)}
                height="200px"
                updateTemplate={updateTemplate}
                firstRender={firstRender}
                setFirstRender={setFirstRender}
                editable={
                  !props.readOnly &&
                  !isWhatsappAction(step.action) &&
                  (hasActiveTeamPlan || isSMSAction(step.action))
                }
                excludedToolbarItems={
                  !isSMSAction(step.action) ? [] : ["blockType", "bold", "italic", "link"]
                }
                plainText={isSMSAction(step.action)}
              />

              {form.formState.errors.steps &&
                form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody && (
                  <p className="text-error mt-1 text-sm">
                    {form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody?.message || ""}
                  </p>
                )}
              {isEmailSubjectNeeded && trigger !== WorkflowTriggerEvents.BOOKING_REQUESTED && (
                <div className="mt-2">
                  <Controller
                    name={`steps.${step.stepNumber - 1}.includeCalendarEvent`}
                    control={form.control}
                    render={() => (
                      <CheckboxField
                        disabled={props.readOnly}
                        defaultChecked={
                          form.getValues(`steps.${step.stepNumber - 1}.includeCalendarEvent`) || false
                        }
                        description={t("include_calendar_event")}
                        descriptionClassName="ml-0"
                        onChange={(e) =>
                          form.setValue(
                            `steps.${step.stepNumber - 1}.includeCalendarEvent`,
                            e.target.checked,
                            { shouldDirty: true }
                          )
                        }
                      />
                    )}
                  />
                </div>
              )}
              {(step.action === WorkflowActions.EMAIL_ATTENDEE ||
                step.action === WorkflowActions.SMS_ATTENDEE) && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <Controller
                      name={`steps.${step.stepNumber - 1}.autoTranslateEnabled`}
                      control={form.control}
                      render={() => (
                        <CheckboxField
                          disabled={props.readOnly || !props.user.organizationId}
                          defaultChecked={
                            form.getValues(`steps.${step.stepNumber - 1}.autoTranslateEnabled`) || false
                          }
                          description={t("auto_translate_for_attendees")}
                          descriptionClassName="ml-0"
                          onChange={(e) =>
                            form.setValue(
                              `steps.${step.stepNumber - 1}.autoTranslateEnabled`,
                              e.target.checked,
                              { shouldDirty: true }
                            )
                          }
                        />
                      )}
                    />
                    {!props.user.organizationId && (
                      <Badge variant="gray" size="sm">
                        {t("upgrade_to_organizations")}
                      </Badge>
                    )}
                  </div>
                  {props.user.organizationId &&
                    form.watch(`steps.${step.stepNumber - 1}.autoTranslateEnabled`) && (
                      <p className="text-subtle ml-6 mt-1 text-xs">
                        {t("auto_translate_source_language_hint", {
                          language: new Intl.DisplayNames([i18n.language], { type: "language" }).of(
                            props.user.locale || "en"
                          ),
                        })}
                      </p>
                    )}
                </div>
              )}
              {!props.readOnly && (
                <div className="ml-1 mt-2">
                  <button type="button" onClick={() => setIsAdditionalInputsDialogOpen(true)}>
                    <div className="text-subtle ml-1 flex items-center gap-2">
                      <CircleHelpIcon className="h-3 w-3" />
                      <p className="text-left text-xs">
                        {isFormTrigger(trigger)
                          ? t("using_form_responses_as_variables")
                          : t("using_booking_questions_as_variables")}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

          {/* {form.getValues(`steps.${step.stepNumber - 1}.action`) !== WorkflowActions.SMS_ATTENDEE && (
                <Button
                  type="button"
                  className="mt-7 w-full"
                  onClick={() => {
                    let isEmpty = false;

                    if (!form.getValues(`steps.${step.stepNumber - 1}.sendTo`) && isPhoneNumberNeeded) {
                      form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
                        type: "custom",
                        message: t("no_input"),
                      });
                      isEmpty = true;
                    }

                    if (!numberVerified && isPhoneNumberNeeded) {
                      form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
                        type: "custom",
                        message: t("not_verified"),
                      });
                    }
                    if (
                      form.getValues(`steps.${step.stepNumber - 1}.template`) === WorkflowTemplates.CUSTOM
                    ) {
                      if (!form.getValues(`steps.${step.stepNumber - 1}.reminderBody`)) {
                        form.setError(`steps.${step.stepNumber - 1}.reminderBody`, {
                          type: "custom",
                          message: t("no_input"),
                        });
                        isEmpty = true;
                      } else if (
                        isEmailSubjectNeeded &&
                        !form.getValues(`steps.${step.stepNumber - 1}.emailSubject`)
                      ) {
                        form.setError(`steps.${step.stepNumber - 1}.emailSubject`, {
                          type: "custom",
                          message: t("no_input"),
                        });
                        isEmpty = true;
                      }
                    }

                    if (!isPhoneNumberNeeded && !isEmpty) {
                      //translate body and reminder to english
                      const emailSubject = translateVariablesToEnglish(
                        form.getValues(`steps.${step.stepNumber - 1}.emailSubject`) || "",
                        { locale: i18n.language, t }
                      );
                      const reminderBody = translateVariablesToEnglish(
                        form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "",
                        { locale: i18n.language, t }
                      );

                      testActionMutation.mutate({
                        step,
                        emailSubject,
                        reminderBody,
                      });
                    } else {
                      const isNumberValid =
                        form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo
                          ? false
                          : true;

                      if (isPhoneNumberNeeded && isNumberValid && !isEmpty && numberVerified) {
                        setConfirmationDialogOpen(true);
                      }
                    }
                  }}
                  color="secondary">
                  <div className="w-full">{t("test_action")}</div>
                </Button>
              )} */}
        </div>
        {/* <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
          <ConfirmationDialogContent
            variety="warning"
            title={t("test_workflow_action")}
            confirmBtnText={t("send_sms")}
            onConfirm={(e) => {
              e.preventDefault();
              const reminderBody = translateVariablesToEnglish(
                form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "",
                { locale: i18n.language, t }
              );

              testActionMutation.mutate({
                step,
                emailSubject: "",
                reminderBody: reminderBody || "",
              });
              setConfirmationDialogOpen(false);
            }}>
            {t("send_sms_to_number", { number: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) })}
          </ConfirmationDialogContent>
        </Dialog> */}
        <Dialog open={isAdditionalInputsDialogOpen} onOpenChange={setIsAdditionalInputsDialogOpen}>
          <DialogContent enableOverflow type="creation" className="sm:max-w-[610px]">
            <div>
              <h1 className="w-full text-xl font-semibold">
                {isFormTrigger(trigger)
                  ? t("how_form_responses_as_variables")
                  : t("how_booking_questions_as_variables")}
              </h1>
              <div className="mb-6 rounded-md sm:p-4">
                <p className="test-sm font-medium">{t("format")}</p>
                <ul className="text-emphasis ml-5 mt-2 list-disc">
                  <li>{t("uppercase_for_letters")}</li>
                  <li>{t("replace_whitespaces_underscores")}</li>
                  <li>
                    {isFormTrigger(trigger)
                      ? t("ignore_special_characters_form_responses")
                      : t("ignore_special_characters_booking_questions")}
                  </li>
                </ul>
                <div className="mt-4">
                  <p className="test-sm w-full font-medium">{t("example_1")}</p>
                  <div className="mt-2 grid grid-cols-12">
                    <div className="test-sm text-default col-span-5 ltr:mr-2 rtl:ml-2">
                      {isFormTrigger(trigger) ? t("form_field_identifier") : t("booking_question_identifier")}
                    </div>
                    <div className="test-sm text-emphasis col-span-7">{t("company_size")}</div>
                    <div className="test-sm text-default col-span-5 w-full">{t("variable")}</div>

                    <div className="test-sm text-emphasis wrap-break-word col-span-7">
                      {" "}
                      {`{${t("company_size")
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .trim()
                        .replace(/ /g, "_")
                        .toUpperCase()}}`}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="test-sm w-full font-medium">{t("example_2")}</p>
                  <div className="mt-2 grid grid-cols-12">
                    <div className="test-sm text-default col-span-5 ltr:mr-2 rtl:ml-2">
                      {isFormTrigger(trigger) ? t("form_field_identifier") : t("booking_question_identifier")}
                    </div>
                    <div className="test-sm text-emphasis col-span-7">{t("what_help_needed")}</div>
                    <div className="test-sm text-default col-span-5">{t("variable")}</div>
                    <div className="test-sm text-emphasis wrap-break-word col-span-7">
                      {" "}
                      {`{${t("what_help_needed")
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .trim()
                        .replace(/ /g, "_")
                        .toUpperCase()}}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter showDivider>
              <DialogClose color="primary" />
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Step Confirmation Dialog */}
        <Dialog open={isDeleteStepDialogOpen} onOpenChange={setIsDeleteStepDialogOpen}>
          <DialogContent type="confirmation" title={t("delete_workflow_step")}>
            <div className="stack-y-4">
              <p className="text-default text-sm">
                {t("are_you_sure_you_want_to_delete_workflow_step")}
              </p>
            </div>
            <DialogFooter showDivider>
              <Button type="button" color="secondary" onClick={() => setIsDeleteStepDialogOpen?.(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                StartIcon="trash"
                color="destructive"
                onClick={() => {
                  // Proceed with deletion
                  const steps = form.getValues("steps");
                  const updatedSteps = steps
                    ?.filter((currStep) => currStep.id !== step.id)
                    .map((s) => {
                      const updatedStep = s;
                      if (step.stepNumber < updatedStep.stepNumber) {
                        updatedStep.stepNumber = updatedStep.stepNumber - 1;
                      }
                      return updatedStep;
                    });
                  form.setValue("steps", updatedSteps, { shouldDirty: true });
                  if (setReload) {
                    setReload(!reload);
                  }
                  setIsDeleteStepDialogOpen?.(false);
                }}>
                {t("delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <></>;
}
