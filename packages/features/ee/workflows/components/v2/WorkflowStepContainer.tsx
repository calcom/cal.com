import {
  TimeUnit,
  WorkflowActions,
  WorkflowStep,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@prisma/client";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import "react-phone-number-input/style.css";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Dialog } from "@calcom/ui/Dialog";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/components";
import { Checkbox } from "@calcom/ui/components";
import { EmailField, Label, TextArea } from "@calcom/ui/components/form";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import { DialogClose, DialogContent } from "@calcom/ui/v2";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import Select from "@calcom/ui/v2/core/form/select";
import showToast from "@calcom/ui/v2/core/notifications";

import { AddVariablesDropdown } from "../../components/v2/AddVariablesDropdown";
import {
  getWorkflowActionOptions,
  getWorkflowTemplateOptions,
  getWorkflowTriggerOptions,
} from "../../lib/getOptions";
import { translateVariablesToEnglish } from "../../lib/variableTranslations";
import type { FormValues } from "../../pages/v2/workflow";
import { TimeTimeUnitInput } from "./TimeTimeUnitInput";

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
  isFreeUser: boolean;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t, i18n } = useLocale();
  const { step, form, reload, setReload, isFreeUser } = props;
  const [isAdditionalInputsDialogOpen, setIsAdditionalInputsDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(
    step?.action === WorkflowActions.SMS_NUMBER ? true : false
  );

  const [isEmailAddressNeeded, setIsEmailAddressNeeded] = useState(
    step?.action === WorkflowActions.EMAIL_ADDRESS ? true : false
  );

  const [isCustomReminderBodyNeeded, setIsCustomReminderBodyNeeded] = useState(
    step?.template === WorkflowTemplates.CUSTOM ? true : false
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

  const actionOptions = getWorkflowActionOptions(t);
  const triggerOptions = getWorkflowTriggerOptions(t);
  const templateOptions = getWorkflowTemplateOptions(t);

  const { ref: emailSubjectFormRef, ...restEmailSubjectForm } = step
    ? form.register(`steps.${step.stepNumber - 1}.emailSubject`)
    : { ref: null, name: "" };

  const { ref: reminderBodyFormRef, ...restReminderBodyForm } = step
    ? form.register(`steps.${step.stepNumber - 1}.reminderBody`)
    : { ref: null, name: "" };

  const refEmailSubject = useRef<HTMLTextAreaElement | null>(null);

  const refReminderBody = useRef<HTMLTextAreaElement | null>(null);

  const addVariable = (isEmailSubject: boolean, variable: string) => {
    if (step) {
      if (isEmailSubject) {
        const currentEmailSubject = refEmailSubject?.current?.value || "";
        const cursorPosition = refEmailSubject?.current?.selectionStart || currentEmailSubject.length;
        const subjectWithAddedVariable = `${currentEmailSubject.substring(0, cursorPosition)}{${variable
          .toUpperCase()
          .replace(/ /g, "_")}}${currentEmailSubject.substring(cursorPosition)}`;
        form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectWithAddedVariable);
      } else {
        const currentMessageBody = refReminderBody?.current?.value || "";
        const cursorPosition = refReminderBody?.current?.selectionStart || currentMessageBody.length;
        const messageWithAddedVariable = `${currentMessageBody.substring(0, cursorPosition)}{${variable
          .toUpperCase()
          .replace(/ /g, "_")}}${currentMessageBody.substring(cursorPosition)}`;
        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, messageWithAddedVariable);
      }
    }
  };

  const testActionMutation = trpc.viewer.workflows.testAction.useMutation({
    onSuccess: async () => {
      showToast(t("notification_sent"), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

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
          <div className="min-w-80 w-full rounded-md border border-gray-200 bg-white p-7">
            <div className="flex">
              <div className="mt-[3px] mr-5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 p-1 text-xs font-medium">
                1
              </div>
              <div>
                <div className="text-base font-bold">{t("trigger")}</div>
                <div className="text-sm text-gray-600">{t("when_something_happens")}</div>
              </div>
            </div>
            <div className="my-7 border-t border-gray-200" />
            <Label>{t("when")}</Label>
            <Controller
              name="trigger"
              control={form.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    className="text-sm"
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
                <TimeTimeUnitInput form={form} />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (step && step.action) {
    const actionString = t(`${step.action.toLowerCase()}_action`);

    const selectedAction = {
      label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
      value: step.action,
    };

    const selectedTemplate = { label: t(`${step.template.toLowerCase()}`), value: step.template };

    return (
      <>
        <div className="my-3 flex justify-center">
          <Icon.FiArrowDown className="stroke-[1.5px] text-3xl text-gray-500" />
        </div>
        <div className="flex justify-center">
          <div className="min-w-80 flex w-full rounded-md border border-gray-200 bg-white p-7">
            <div className="w-full">
              <div className="flex">
                <div className="w-full">
                  <div className="flex">
                    <div className="mt-[3px] mr-5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 p-1 text-xs">
                      {step.stepNumber + 1}
                    </div>
                    <div>
                      <div className="text-base font-bold">{t("action")}</div>
                      <div className="text-sm text-gray-600">{t("action_is_performed")}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <Dropdown>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" color="minimal" size="icon" StartIcon={Icon.FiMoreHorizontal} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Button
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
                          }}
                          color="secondary"
                          size="base"
                          StartIcon={Icon.FiTrash2}
                          className="w-full rounded-none">
                          {t("delete")}
                        </Button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </Dropdown>
                </div>
              </div>
              <div className="my-7 border-t border-gray-200" />
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
                        onChange={(val) => {
                          if (val) {
                            if (val.value === WorkflowActions.SMS_NUMBER) {
                              setIsPhoneNumberNeeded(true);
                              setIsEmailAddressNeeded(false);
                            } else if (val.value === WorkflowActions.EMAIL_ADDRESS) {
                              setIsEmailAddressNeeded(true);
                              setIsPhoneNumberNeeded(false);
                            } else {
                              setIsEmailAddressNeeded(false);
                              setIsPhoneNumberNeeded(false);
                            }
                            form.unregister(`steps.${step.stepNumber - 1}.sendTo`);
                            form.clearErrors(`steps.${step.stepNumber - 1}.sendTo`);
                            if (
                              val.value === WorkflowActions.EMAIL_ATTENDEE ||
                              val.value === WorkflowActions.EMAIL_HOST ||
                              val.value === WorkflowActions.EMAIL_ADDRESS
                            ) {
                              setIsEmailSubjectNeeded(true);
                            } else {
                              setIsEmailSubjectNeeded(false);
                            }
                            form.setValue(`steps.${step.stepNumber - 1}.action`, val.value);
                          }
                        }}
                        defaultValue={selectedAction}
                        options={
                          isFreeUser
                            ? actionOptions.filter(
                                (actionOption) =>
                                  actionOption.value !== WorkflowActions.SMS_ATTENDEE &&
                                  actionOption.value !== WorkflowActions.SMS_NUMBER
                              )
                            : actionOptions
                        }
                      />
                    );
                  }}
                />
                {form.getValues(`steps.${step.stepNumber - 1}.action`) === WorkflowActions.SMS_ATTENDEE && (
                  <div className="mt-5">
                    <Controller
                      name={`steps.${step.stepNumber - 1}.numberRequired`}
                      control={form.control}
                      render={() => (
                        <Checkbox
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
              </div>
              {isPhoneNumberNeeded && (
                <div className="mt-5 rounded-md bg-gray-50 p-4">
                  <Label>{t("custom_phone_number")}</Label>
                  <PhoneInput<FormValues>
                    control={form.control}
                    name={`steps.${step.stepNumber - 1}.sendTo`}
                    placeholder={t("phone_number")}
                    id={`steps.${step.stepNumber - 1}.sendTo`}
                    className="w-full rounded-md"
                    required
                  />
                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                      </p>
                    )}
                </div>
              )}
              {isEmailAddressNeeded && (
                <div className="mt-5 rounded-md bg-gray-50 p-4">
                  <EmailField
                    required
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
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="text-sm"
                        onChange={(val) => {
                          if (val) {
                            form.setValue(`steps.${step.stepNumber - 1}.template`, val.value);
                            const isCustomTemplate = val.value === WorkflowTemplates.CUSTOM;
                            setIsCustomReminderBodyNeeded(isCustomTemplate);
                          }
                        }}
                        defaultValue={selectedTemplate}
                        options={templateOptions}
                      />
                    );
                  }}
                />
              </div>
              {isCustomReminderBodyNeeded && (
                <div className="mt-2 rounded-md bg-gray-50 p-4 pt-2 md:p-6 md:pt-4">
                  {isEmailSubjectNeeded && (
                    <div className="mb-5">
                      <div className="mb-2 flex items-center">
                        <Label className="mb-0 flex-none">{t("subject")}</Label>
                        <div className="flex-grow text-right">
                          <AddVariablesDropdown addVariable={addVariable} isEmailSubject={true} />
                        </div>
                      </div>
                      <TextArea
                        ref={(e) => {
                          emailSubjectFormRef?.(e);
                          refEmailSubject.current = e;
                        }}
                        className="my-0"
                        required
                        {...restEmailSubjectForm}
                      />
                      {form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject && (
                          <p className="mt-1 text-sm text-red-500">
                            {form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject?.message || ""}
                          </p>
                        )}
                    </div>
                  )}
                  <div className="mb-2 flex items-center">
                    <Label className="mb-0 flex-none">
                      {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                    </Label>
                    <div className="flex-grow text-right">
                      <AddVariablesDropdown addVariable={addVariable} isEmailSubject={false} />
                    </div>
                  </div>
                  <TextArea
                    ref={(e) => {
                      reminderBodyFormRef?.(e);
                      refReminderBody.current = e;
                    }}
                    className="my-0 h-24"
                    required
                    {...restReminderBodyForm}
                  />
                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody?.message || ""}
                      </p>
                    )}
                  <div className="mt-3 ">
                    <button type="button" onClick={() => setIsAdditionalInputsDialogOpen(true)}>
                      <div className="mt-2 flex text-sm text-gray-600">
                        <Icon.FiHelpCircle className="mt-[3px] mr-2 h-3 w-3" />
                        <p className="text-left">{t("using_additional_inputs_as_variables")}</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              {form.getValues(`steps.${step.stepNumber - 1}.action`) !== WorkflowActions.SMS_ATTENDEE && (
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
                        action: step.action,
                        emailSubject,
                        reminderBody,
                        template: step.template,
                      });
                    } else {
                      const isNumberValid =
                        form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo
                          ? false
                          : true;

                      if (isPhoneNumberNeeded && isNumberValid && !isEmpty) {
                        setConfirmationDialogOpen(true);
                      }
                    }
                  }}
                  color="secondary">
                  <div className="w-full">{t("test_action")}</div>
                </Button>
              )}
            </div>
          </div>
        </div>
        <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
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
                action: step.action,
                emailSubject: "",
                reminderBody: reminderBody || "",
                template: step.template,
                sendTo: step.sendTo || "",
              });
              setConfirmationDialogOpen(false);
            }}>
            {t("send_sms_to_number", { number: form.getValues(`steps.${step.stepNumber - 1}.sendTo`) })}
          </ConfirmationDialogContent>
        </Dialog>
        <Dialog open={isAdditionalInputsDialogOpen} onOpenChange={setIsAdditionalInputsDialogOpen}>
          <DialogContent useOwnActionButtons type="creation" className="sm:max-w-[610px] md:h-[570px]">
            <div className="-m-3 h-[430px] overflow-x-hidden overflow-y-scroll sm:m-0">
              <h1 className="w-full text-xl font-semibold ">{t("how_additional_inputs_as_variables")}</h1>
              <div className="mb-7 mt-7 rounded-md bg-gray-50 p-3 sm:p-4">
                <p className="test-sm font-medium">{t("format")}</p>
                <ul className="mt-2 ml-5 list-disc text-gray-900">
                  <li>{t("uppercase_for_letters")}</li>
                  <li>{t("replace_whitespaces_underscores")}</li>
                  <li>{t("ignore_special_characters")}</li>
                </ul>
                <div className="mt-6">
                  <p className="test-sm w-full font-medium">{t("example_1")}</p>
                  <div className="mt-2 grid grid-cols-12">
                    <div className="test-sm col-span-5 mr-2 text-gray-600">{t("additional_input_label")}</div>
                    <div className="test-sm col-span-7 text-gray-900">{t("company_size")}</div>
                    <div className="test-sm col-span-5 w-full text-gray-600">{t("variable")}</div>

                    <div className="test-sm col-span-7 break-words text-gray-900">
                      {" "}
                      {`{${t("company_size")
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .trim()
                        .replace(/ /g, "_")
                        .toUpperCase()}}`}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="test-sm w-full font-medium">{t("example_2")}</p>
                  <div className="mt-2 grid grid-cols-12">
                    <div className="test-sm col-span-5 mr-2 text-gray-600">{t("additional_input_label")}</div>
                    <div className="test-sm col-span-7 text-gray-900">{t("what_help_needed")}</div>
                    <div className="test-sm col-span-5 text-gray-600">{t("variable")}</div>
                    <div className="test-sm col-span-7 break-words text-gray-900">
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
            <div className="flex flex-row-reverse">
              <DialogClose asChild>
                <Button color="primary" type="button">
                  {t("close")}
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <></>;
}
