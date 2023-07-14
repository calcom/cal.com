import type { WorkflowStep } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { useRef, useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import "react-phone-number-input/style.css";

import { classNames } from "@calcom/lib";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { WorkflowTemplates, TimeUnit, WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  EmailField,
  Label,
  PhoneInput,
  Select,
  showToast,
  TextArea,
  TextField,
  Editor,
  AddVariablesDropdown,
  Input,
  Tooltip,
} from "@calcom/ui";
import { ArrowDown, MoreHorizontal, Trash2, HelpCircle, Info } from "@calcom/ui/components/icon";

import { DYNAMIC_TEXT_VARIABLES } from "../lib/constants";
import { isAttendeeAction, isSMSAction, isSMSOrWhatsappAction, isWhatsappAction, getWhatsappTemplateForAction } from "../lib/actionHelperFunctions";
import { getWorkflowTemplateOptions, getWorkflowTriggerOptions } from "../lib/getOptions";
import emailReminderTemplate from "../lib/reminders/templates/emailReminderTemplate";
import smsReminderTemplate from "../lib/reminders/templates/smsReminderTemplate";
import { whatsappReminderTemplate } from "../lib/reminders/templates/whatsapp";
import type { FormValues } from "../pages/workflow";
import { TimeTimeUnitInput } from "./TimeTimeUnitInput";

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
  teamId?: number;
  readOnly: boolean;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { step, form, reload, setReload, teamId } = props;
  const { data: _verifiedNumbers } = trpc.viewer.workflows.getVerifiedNumbers.useQuery(
    { teamId },
    { enabled: !!teamId }
  );
  const verifiedNumbers = _verifiedNumbers?.map((number) => number.phoneNumber) || [];
  const [isAdditionalInputsDialogOpen, setIsAdditionalInputsDialogOpen] = useState(false);

  const [verificationCode, setVerificationCode] = useState("");

  const action = step?.action
  const requirePhoneNumber = WorkflowActions.SMS_NUMBER === action || WorkflowActions.WHATSAPP_NUMBER === action;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(requirePhoneNumber);

  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [firstRender, setFirstRender] = useState(true);

  const senderNeeded = step?.action === WorkflowActions.SMS_NUMBER || step?.action === WorkflowActions.SMS_ATTENDEE;

  const [isSenderIsNeeded, setIsSenderIsNeeded] = useState(senderNeeded);

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

  const [showTimeSection, setShowTimeSection] = useState(
    form.getValues("trigger") === WorkflowTriggerEvents.BEFORE_EVENT ||
      form.getValues("trigger") === WorkflowTriggerEvents.AFTER_EVENT
  );

  const [showTimeSectionAfter, setShowTimeSectionAfter] = useState(
    form.getValues("trigger") === WorkflowTriggerEvents.AFTER_EVENT
  );
  const { data: actionOptions } = trpc.viewer.workflows.getWorkflowActionOptions.useQuery();
  const triggerOptions = getWorkflowTriggerOptions(t);
  const templateOptions = getWorkflowTemplateOptions(t, step?.action);

  if (step && form.getValues(`steps.${step.stepNumber - 1}.template`) === WorkflowTemplates.REMINDER) {
    if (!form.getValues(`steps.${step.stepNumber - 1}.reminderBody`)) {
      const action = form.getValues(`steps.${step.stepNumber - 1}.action`);
      if (isSMSAction(action)) {
        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, smsReminderTemplate(
          true,
          action
        ));
      } else if (isWhatsappAction(action)) {
        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, whatsappReminderTemplate(
          true,
          action
        ))
      } else {
        const reminderBodyTemplate = emailReminderTemplate(
          true,
          action
        ).emailBody;
        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, reminderBodyTemplate);
      }
    }
    if (!form.getValues(`steps.${step.stepNumber - 1}.emailSubject`)) {
      const subjectTemplate = emailReminderTemplate(
        true,
        form.getValues(`steps.${step.stepNumber - 1}.action`)
      ).emailSubject;
      form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectTemplate);
    }
  } else if (step && isWhatsappAction(step.action)) {
    const templateBody = getWhatsappTemplateForAction(step.action, step.template)
    form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, templateBody)
  }

  const { ref: emailSubjectFormRef, ...restEmailSubjectForm } = step
    ? form.register(`steps.${step.stepNumber - 1}.emailSubject`)
    : { ref: null, name: "" };

  const { ref: reminderBodyFormRef, ...restReminderBodyForm } = step
    ? form.register(`steps.${step.stepNumber - 1}.reminderBody`)
    : { ref: null, name: "" };

  const refEmailSubject = useRef<HTMLTextAreaElement | null>(null);

  const refReminderBody = useRef<HTMLTextAreaElement | null>(null);

  const getNumberVerificationStatus = () => !!step && !!verifiedNumbers.find((number: string) => number === form.getValues(`steps.${step.stepNumber - 1}.sendTo`))

  const [numberVerified, setNumberVerified] = useState(getNumberVerificationStatus());

  useEffect(() => setNumberVerified(getNumberVerificationStatus()), [verifiedNumbers.length]);

  const addVariableBody = (variable: string) => {
    if (step) {
      const currentMessageBody = refReminderBody?.current?.value || "";
      const cursorPosition = refReminderBody?.current?.selectionStart || currentMessageBody.length;
      const messageWithAddedVariable = `${currentMessageBody.substring(0, cursorPosition)}{${variable
        .toUpperCase()
        .replace(/ /g, "_")}}${currentMessageBody.substring(cursorPosition)}`;
      form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, messageWithAddedVariable);
    }
  };

  const addVariableEmailSubject = (variable: string) => {
    if (step) {
      const currentEmailSubject = refEmailSubject?.current?.value || "";
      const cursorPosition = refEmailSubject?.current?.selectionStart || currentEmailSubject.length;
      const subjectWithAddedVariable = `${currentEmailSubject.substring(0, cursorPosition)}{${variable
        .toUpperCase()
        .replace(/ /g, "_")}}${currentEmailSubject.substring(cursorPosition)}`;
      form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectWithAddedVariable);
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
    const trigger = form.getValues("trigger");
    const triggerString = t(`${trigger.toLowerCase()}_trigger`);

    const selectedTrigger = {
      label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1),
      value: trigger,
    };

    return (
      <>
        <div className="flex justify-center">
          <div className="w-full border rounded-md min-w-80 bg-default border-subtle p-7">
            <div className="flex">
              <div className="bg-subtle text-default mt-[3px] flex h-5 w-5 items-center justify-center rounded-full p-1 text-xs font-medium ltr:mr-5 rtl:ml-5">
                1
              </div>
              <div>
                <div className="text-base font-bold text-emphasis">{t("trigger")}</div>
                <div className="text-sm text-default">{t("when_something_happens")}</div>
              </div>
            </div>
            <div className="border-t border-subtle my-7" />
            <Label>{t("when")}</Label>
            <Controller
              name="trigger"
              control={form.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    className="text-sm"
                    isDisabled={props.readOnly}
                    onChange={(val) => {
                      if (val) {
                        form.setValue("trigger", val.value);
                        if (
                          val.value === WorkflowTriggerEvents.BEFORE_EVENT ||
                          val.value === WorkflowTriggerEvents.AFTER_EVENT
                        ) {
                          setShowTimeSection(true);
                          if (val.value === WorkflowTriggerEvents.AFTER_EVENT) {
                            setShowTimeSectionAfter(true);
                          } else {
                            setShowTimeSectionAfter(false);
                          }
                          form.setValue("time", 24);
                          form.setValue("timeUnit", TimeUnit.HOUR);
                        } else {
                          setShowTimeSection(false);
                          setShowTimeSectionAfter(false);
                          form.unregister("time");
                          form.unregister("timeUnit");
                        }
                      }
                    }}
                    defaultValue={selectedTrigger}
                    options={triggerOptions}
                  />
                );
              }}
            />
            {showTimeSection && (
              <div className="mt-5">
                <Label>{showTimeSectionAfter ? t("how_long_after") : t("how_long_before")}</Label>
                <TimeTimeUnitInput form={form} disabled={props.readOnly} />
                {!props.readOnly && (
                  <div className="flex mt-1 text-gray-500">
                    <Info className="mr-1 mt-0.5 h-4 w-4" />
                    <p className="text-sm">{t("testing_workflow_info_message")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (step && step.action) {
    const templateValue = form.watch(`steps.${step.stepNumber - 1}.template`);
    const actionString = t(`${step.action.toLowerCase()}_action`);

    const selectedAction = {
      label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
      value: step.action,
      needsUpgrade: false,
    };

    const selectedTemplate = { label: t(`${step.template.toLowerCase()}`), value: step.template };

    const canRequirePhoneNumber = (workflowStep: string) => {
      return (
        WorkflowActions.SMS_ATTENDEE === workflowStep ||
        WorkflowActions.WHATSAPP_ATTENDEE === workflowStep
      )
    }

    return (
      <>
        <div className="flex justify-center my-3">
          <ArrowDown className="text-subtle stroke-[1.5px] text-3xl" />
        </div>
        <div className="flex justify-center">
          <div className="flex w-full border rounded-md min-w-80 bg-default border-subtle p-7">
            <div className="w-full">
              <div className="flex">
                <div className="w-full">
                  <div className="flex">
                    <div className="bg-subtle text-default mt-[3px] flex h-5 w-5 items-center justify-center rounded-full p-1 text-xs ltr:mr-5 rtl:ml-5">
                      {step.stepNumber + 1}
                    </div>
                    <div>
                      <div className="text-base font-bold text-emphasis">{t("action")}</div>
                      <div className="text-sm text-default">{t("action_is_performed")}</div>
                    </div>
                  </div>
                </div>
                {!props.readOnly && (
                  <div>
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" color="minimal" variant="icon" StartIcon={MoreHorizontal} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            StartIcon={Trash2}
                            color="destructive"
                            onClick={() => {
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
                              form.setValue("steps", updatedSteps);
                              if (setReload) {
                                setReload(!reload);
                              }
                            }}>
                            {t("delete")}
                          </DropdownItem>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </Dropdown>
                  </div>
                )}
              </div>
              <div className="border-t border-subtle my-7" />
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

                            const setNumberRequiredConfigs = (phoneNumberIsNeeded: boolean, senderNeeded = true) => {
                              setIsSenderIsNeeded(senderNeeded);
                              setIsEmailAddressNeeded(false);
                              setIsPhoneNumberNeeded(phoneNumberIsNeeded);
                              setNumberVerified(getNumberVerificationStatus());
                            }

                            if (isSMSAction(val.value)) {

                              setNumberRequiredConfigs(val.value === WorkflowActions.SMS_NUMBER)
                              // email action changes to sms action
                              if (!isSMSAction(oldValue)) {
                                form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, "");
                                form.setValue(`steps.${step.stepNumber - 1}.sender`, SENDER_ID);
                              }

                              setIsEmailSubjectNeeded(false);
                            } else if (isWhatsappAction(val.value)) {
                              setNumberRequiredConfigs(val.value === WorkflowActions.WHATSAPP_NUMBER, false);

                              if (!isWhatsappAction(oldValue)) {
                                form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, "");
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
                              form.getValues(`steps.${step.stepNumber - 1}.template`) ===
                              WorkflowTemplates.REMINDER
                            ) {
                              if (isSMSOrWhatsappAction(val.value) === isSMSOrWhatsappAction(oldValue)) {
                                if (isAttendeeAction(oldValue) !== isAttendeeAction(val.value)) {
                                  const currentReminderBody =
                                    form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "";
                                  const newReminderBody = currentReminderBody
                                    .replaceAll("{ORGANIZER}", "{PLACEHOLDER}")
                                    .replaceAll("{ATTENDEE}", "{ORGANIZER}")
                                    .replaceAll("{PLACEHOLDER}", "{ATTENDEE}");
                                  form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, newReminderBody);

                                  if (!isSMSOrWhatsappAction(val.value)) {
                                    const currentEmailSubject =
                                      form.getValues(`steps.${step.stepNumber - 1}.emailSubject`) || "";
                                    const newEmailSubject = isAttendeeAction(val.value)
                                      ? currentEmailSubject.replace("{ORGANIZER}", "{ATTENDEE}")
                                      : currentEmailSubject.replace("{ATTENDEE}", "{ORGANIZER}");

                                    form.setValue(
                                      `steps.${step.stepNumber - 1}.emailSubject`,
                                      newEmailSubject || ""
                                    );
                                  }
                                }
                              } else {
                                if (isSMSAction(val.value)) {
                                  form.setValue(
                                    `steps.${step.stepNumber - 1}.reminderBody`,
                                    smsReminderTemplate(true, val.value)
                                  );
                                } else if (isWhatsappAction(val.value)) {
                                  form.setValue(
                                    `steps.${step.stepNumber - 1}.reminderBody`,
                                    whatsappReminderTemplate(true, val.value)
                                  );
                                } else {
                                  const emailReminderBody = emailReminderTemplate(true, val.value);
                                  form.setValue(
                                    `steps.${step.stepNumber - 1}.reminderBody`,
                                    emailReminderBody.emailBody
                                  );
                                  form.setValue(
                                    `steps.${step.stepNumber - 1}.emailSubject`,
                                    emailReminderBody.emailSubject
                                  );
                                }
                              }
                            } else {
                              const template = isWhatsappAction(val.value) ? "REMINDER" : "CUSTOM";
                              template && form.setValue(`steps.${step.stepNumber - 1}.template`, template);
                            }
                            form.unregister(`steps.${step.stepNumber - 1}.sendTo`);
                            form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
                            form.setValue(`steps.${step.stepNumber - 1}.action`, val.value);
                            setUpdateTemplate(!updateTemplate);
                          }
                        }}
                        defaultValue={selectedAction}
                        options={actionOptions}
                        isOptionDisabled={(option: {
                          label: string;
                          value: WorkflowActions;
                          needsUpgrade: boolean;
                        }) => option.needsUpgrade}
                      />
                    );
                  }}
                />
              </div>
              {isPhoneNumberNeeded && (
                <div className="p-4 pt-0 mt-2 rounded-md bg-muted">
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

                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                      <p className="mt-1 text-xs text-red-500">
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
                        <div className="flex mt-3">
                          <TextField
                            className="rounded-r-none border-r-transparent"
                            placeholder="Verification code"
                            disabled={props.readOnly}
                            value={verificationCode}
                            onChange={(e) => {
                              setVerificationCode(e.target.value);
                            }}
                            required
                          />
                          <Button
                            color="secondary"
                            className="-ml-[3px] h-[38px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none "
                            disabled={verifyPhoneNumberMutation.isLoading || props.readOnly}
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
                        {form.formState.errors.steps &&
                          form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                            <p className="mt-1 text-xs text-red-500">
                              {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                            </p>
                          )}
                      </>
                    )
                  )}
                </div>
              )}
              {!isWhatsappAction(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (<div className="p-4 pt-0 mt-2 rounded-md bg-muted">
                {isSenderIsNeeded ? (
                  <>
                    <div className="pt-4">
                      <div className="flex">
                        <Label>{t("sender_id")}</Label>
                        <Tooltip content={t("sender_id_info")}>
                          <Info className="ml-2 mr-1 mt-0.5 h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </div>
                      <Input
                        type="text"
                        placeholder={SENDER_ID}
                        disabled={props.readOnly}
                        maxLength={11}
                        {...form.register(`steps.${step.stepNumber - 1}.sender`)}
                      />
                    </div>
                    {form.formState.errors.steps &&
                      form.formState?.errors?.steps[step.stepNumber - 1]?.sender && (
                        <p className="mt-1 text-xs text-red-500">{t("sender_id_error_message")}</p>
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
              </div>)}
              {canRequirePhoneNumber(form.getValues(`steps.${step.stepNumber - 1}.action`)) && (
                <div className="mt-2">
                  <Controller
                    name={`steps.${step.stepNumber - 1}.numberRequired`}
                    control={form.control}
                    render={() => (
                      <Checkbox
                        disabled={props.readOnly}
                        defaultChecked={
                          form.getValues(`steps.${step.stepNumber - 1}.numberRequired`) || false
                        }
                        description={t("make_phone_number_required")}
                        onChange={(e) =>
                          form.setValue(`steps.${step.stepNumber - 1}.numberRequired`, e.target.checked)
                        }
                      />
                    )}
                  />
                </div>
              )}
              {isEmailAddressNeeded && (
                <div className="p-4 mt-5 rounded-md bg-muted">
                  <EmailField
                    required
                    disabled={props.readOnly}
                    label={t("email_address")}
                    {...form.register(`steps.${step.stepNumber - 1}.sendTo`)}
                  />
                </div>
              )}
              <div className="mt-5">
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
                            const action = form.getValues(`steps.${step.stepNumber - 1}.action`)
                            if (val.value === WorkflowTemplates.REMINDER) {
                              if (isWhatsappAction(action)) {
                                form.setValue(
                                  `steps.${step.stepNumber - 1}.reminderBody`,
                                  whatsappReminderTemplate(
                                    true,
                                    action
                                  )
                                );
                              } else if (isSMSAction(action)) {
                                form.setValue(
                                  `steps.${step.stepNumber - 1}.reminderBody`,
                                  smsReminderTemplate(true,action)
                                );
                              } else {
                                form.setValue(
                                  `steps.${step.stepNumber - 1}.reminderBody`,
                                  emailReminderTemplate(true, action).emailBody
                                );
                                form.setValue(
                                  `steps.${step.stepNumber - 1}.emailSubject`,
                                  emailReminderTemplate(true, action).emailSubject
                                );
                              }
                            } else {
                              if (isWhatsappAction(action)) {
                                form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, getWhatsappTemplateForAction(action, val.value))
                              } else {
                                form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, "");
                                form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, "");
                              }
                            }
                            field.onChange(val.value)
                            form.setValue(`steps.${step.stepNumber - 1}.template`, val.value);
                            setUpdateTemplate(!updateTemplate);
                          }
                        }}
                        defaultValue={selectedTemplate}
                        value={selectedTemplate}
                        options={templateOptions}
                      />
                    );
                  }}
                />
              </div>
              <div className="pt-2 mt-2 rounded-md bg-muted md:p-6 md:pt-4">
                {isEmailSubjectNeeded && (
                  <div className="mb-6">
                    <div className="flex items-center">
                      <Label className={classNames("flex-none", props.readOnly ? "mb-2" : "mb-0")}>
                        {t("email_subject")}
                      </Label>
                      {!props.readOnly && (
                        <div className="flex-grow text-right">
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
                      rows={1}
                      disabled={props.readOnly}
                      className="my-0 focus:ring-transparent"
                      required
                      {...restEmailSubjectForm}
                    />
                    {form.formState.errors.steps &&
                      form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject && (
                        <p className="mt-1 text-xs text-red-500">
                          {form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject?.message || ""}
                        </p>
                      )}
                  </div>
                )}

                {step.action !== WorkflowActions.SMS_ATTENDEE &&
                step.action !== WorkflowActions.SMS_NUMBER ? (
                  <>
                    <div className="mb-2 flex items-center pb-[1.5px]">
                      <Label className="flex-none mb-0 ">
                        {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                      </Label>
                    </div>
                    <Editor
                      getText={() => {
                        return props.form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) || "";
                      }}
                      setText={(text: string) => {
                        props.form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, text);
                        props.form.clearErrors();
                      }}
                      variables={DYNAMIC_TEXT_VARIABLES}
                      height="200px"
                      updateTemplate={updateTemplate}
                      firstRender={firstRender}
                      setFirstRender={setFirstRender}
                      editable={!props.readOnly && !isWhatsappAction(step.action)}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <Label className={classNames("flex-none", props.readOnly ? "mb-2" : "mb-0")}>
                        {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                      </Label>
                      {!props.readOnly && (
                        <div className="flex-grow text-right">
                          <AddVariablesDropdown
                            addVariable={addVariableBody}
                            variables={DYNAMIC_TEXT_VARIABLES}
                          />
                        </div>
                      )}
                    </div>
                    <TextArea
                      ref={(e) => {
                        reminderBodyFormRef?.(e);
                        refReminderBody.current = e;
                      }}
                      className="h-24 my-0"
                      disabled={props.readOnly}
                      required
                      {...restReminderBodyForm}
                    />
                  </>
                )}
                {form.formState.errors.steps &&
                  form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody && (
                    <p className="mt-1 text-sm text-red-500">
                      {form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody?.message || ""}
                    </p>
                  )}
                {!props.readOnly && (
                  <div className="mt-3 ">
                    <button type="button" onClick={() => setIsAdditionalInputsDialogOpen(true)}>
                      <div className="flex mt-2 text-sm text-default">
                        <HelpCircle className="mt-[3px] h-3 w-3 ltr:mr-2 rtl:ml-2" />
                        <p className="text-left">{t("using_booking_questions_as_variables")}</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* {form.getValues(`steps.${step.stepNumber - 1}.action`) !== WorkflowActions.SMS_ATTENDEE && (
                <Button
                  type="button"
                  className="w-full mt-7"
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
              )*/}
            </div>
          </div>
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
          <DialogContent type="creation" className="sm:max-w-[610px]">
            <div className="-m-3 h-[430px] overflow-x-hidden overflow-y-scroll sm:m-0">
              <h1 className="w-full text-xl font-semibold ">{t("how_booking_questions_as_variables")}</h1>
              <div className="mb-6 rounded-md bg-muted-3 sm:p-4">
                <p className="font-medium test-sm">{t("format")}</p>
                <ul className="mt-2 ml-5 list-disc text-emphasis">
                  <li>{t("uppercase_for_letters")}</li>
                  <li>{t("replace_whitespaces_underscores")}</li>
                  <li>{t("ignore_special_characters_booking_questions")}</li>
                </ul>
                <div className="mt-4">
                  <p className="w-full font-medium test-sm">{t("example_1")}</p>
                  <div className="grid grid-cols-12 mt-2">
                    <div className="col-span-5 test-sm text-default ltr:mr-2 rtl:ml-2">
                      {t("booking_question_identifier")}
                    </div>
                    <div className="col-span-7 test-sm text-emphasis">{t("company_size")}</div>
                    <div className="w-full col-span-5 test-sm text-default">{t("variable")}</div>

                    <div className="col-span-7 break-words test-sm text-emphasis">
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
                  <p className="w-full font-medium test-sm">{t("example_2")}</p>
                  <div className="grid grid-cols-12 mt-2">
                    <div className="col-span-5 test-sm text-default ltr:mr-2 rtl:ml-2">
                      {t("booking_question_identifier")}
                    </div>
                    <div className="col-span-7 test-sm text-emphasis">{t("what_help_needed")}</div>
                    <div className="col-span-5 test-sm text-default">{t("variable")}</div>
                    <div className="col-span-7 break-words test-sm text-emphasis">
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
            <DialogFooter showDivider className="flex flex-row-reverse">
              <DialogClose color="primary" />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <></>;
}
