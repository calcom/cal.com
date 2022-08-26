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
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { Dialog } from "@calcom/ui/Dialog";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import { Button } from "@calcom/ui/v2";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import Select from "@calcom/ui/v2/core/form/Select";
import { Label, TextArea } from "@calcom/ui/v2/core/form/fields";

import { AddVariablesDropdown } from "../../components/v2/AddVariablesDropdown";
import {
  getWorkflowActionOptions,
  getWorkflowTemplateOptions,
  getWorkflowTriggerOptions,
} from "../../lib/getOptions";
import { getTranslatedText, translateVariablesToEnglish } from "../../lib/variableTranslations";
import type { FormValues } from "../../pages/v2/workflow";
import { TimeTimeUnitInput } from "./TimeTimeUnitInput";

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t, i18n } = useLocale();
  const { step, form, reload, setReload } = props;
  const [isInfoParagraphOpen, setIsInfoParagraphOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const emailSubject = step ? form.getValues(`steps.${step.stepNumber - 1}.emailSubject`) : "";
  const reminderBody = step ? form.getValues(`steps.${step.stepNumber - 1}.emailSubject`) : "";

  const [translatedReminderBody, setTranslatedReminderBody] = useState(
    getTranslatedText(emailSubject || "", {
      locale: i18n.language,
      t,
    })
  );

  const [translatedSubject, setTranslatedSubject] = useState(
    getTranslatedText(reminderBody || "", {
      locale: i18n.language,
      t,
    })
  );
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(
    step?.action === WorkflowActions.SMS_NUMBER ? true : false
  );

  const [isCustomReminderBodyNeeded, setIsCustomReminderBodyNeeded] = useState(
    step?.template === WorkflowTemplates.CUSTOM ? true : false
  );

  const [isEmailSubjectNeeded, setIsEmailSubjectNeeded] = useState(
    step?.action === WorkflowActions.EMAIL_ATTENDEE || step?.action === WorkflowActions.EMAIL_HOST
      ? true
      : false
  );

  const [showTimeSection, setShowTimeSection] = useState(
    form.getValues("trigger") === WorkflowTriggerEvents.BEFORE_EVENT ? true : false
  );

  const actionOptions = getWorkflowActionOptions(t);
  const triggerOptions = getWorkflowTriggerOptions(t);
  const templateOptions = getWorkflowTemplateOptions(t);

  const { ref: emailSubjectFormRef, ...restEmailSubjectForm } = form.register(
    `steps.${step ? step.stepNumber - 1 : 0}.emailSubject`
  );

  const { ref: reminderBodyFormRef, ...restReminderBodyForm } = form.register(
    `steps.${step ? step.stepNumber - 1 : 0}.reminderBody`
  );

  const refEmailSubject = useRef<HTMLTextAreaElement | null>(null);

  const refReminderBody = useRef<HTMLTextAreaElement | null>(null);

  const addVariable = (isEmailSubject: boolean, variable: string) => {
    if (step) {
      if (isEmailSubject) {
        const currentEmailSubject = refEmailSubject?.current?.value || "";
        const cursorPosition = refEmailSubject?.current?.selectionStart || currentEmailSubject.length;
        const subjectWithAddedVariable = `${currentEmailSubject.substring(0, cursorPosition)}{${variable
          .toUpperCase()
          .replace(" ", "_")}}${currentEmailSubject.substring(cursorPosition)}`;
        form.setValue(`steps.${step.stepNumber - 1}.emailSubject`, subjectWithAddedVariable);
      } else {
        const currentMessageBody = refReminderBody?.current?.value || "";
        const cursorPosition = refReminderBody?.current?.selectionStart || currentMessageBody.length;
        const messageWithAddedVariable = `${currentMessageBody.substring(0, cursorPosition)}{${variable
          .toUpperCase()
          .replace(" ", "_")}}${currentMessageBody.substring(cursorPosition)}`;
        form.setValue(`steps.${step.stepNumber - 1}.reminderBody`, messageWithAddedVariable);
      }
    }
  };

  const testActionMutation = trpc.useMutation("viewer.workflows.testAction", {
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
    const timeUnit = form.getValues("timeUnit");

    const selectedTrigger = {
      label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1),
      value: trigger,
    };
    const selectedTimeUnit = timeUnit
      ? { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit }
      : undefined;

    return (
      <>
        <div className="flex justify-center">
          <div className="min-w-80 w-full rounded-md border border-gray-200 bg-white p-7">
            <div className="text-base font-bold">{t("trigger")}</div>
            <div className="text-sm text-gray-600">{t("when_something_happens")}</div>
            <div className="my-7 border-t border-gray-200" />
            <Label className="block text-sm font-medium text-gray-700">{t("when")}</Label>
            <Controller
              name="trigger"
              control={form.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                    onChange={(val) => {
                      if (val) {
                        form.setValue("trigger", val.value);
                        if (val.value === WorkflowTriggerEvents.BEFORE_EVENT) {
                          setShowTimeSection(true);
                          form.setValue("time", 24);
                          form.setValue("timeUnit", TimeUnit.HOUR);
                        } else {
                          setShowTimeSection(false);
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
              <div className="mt-5 space-y-1">
                <Label className="block text-sm font-medium text-gray-700">{t("how_long_before")}</Label>
                <TimeTimeUnitInput form={form} />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (step && step.action) {
    const selectedAction = { label: t(`${step.action.toLowerCase()}_action`), value: step.action };
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
                  <div className="text-base font-bold">{t("action")}</div>
                  <div className="text-sm text-gray-600">{t("action_is_performed")}</div>
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
                <Label className="block text-sm font-medium text-gray-700">{t("do_this")}</Label>
                <Controller
                  name={`steps.${step.stepNumber - 1}.action`}
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                        onChange={(val) => {
                          if (val) {
                            if (val.value === WorkflowActions.SMS_NUMBER) {
                              setIsPhoneNumberNeeded(true);
                            } else {
                              setIsPhoneNumberNeeded(false);
                            }
                            if (
                              val.value === WorkflowActions.EMAIL_ATTENDEE ||
                              val.value === WorkflowActions.EMAIL_HOST
                            ) {
                              setIsEmailSubjectNeeded(true);
                            } else {
                              setIsEmailSubjectNeeded(false);
                            }
                            form.setValue(`steps.${step.stepNumber - 1}.action`, val.value);
                          }
                        }}
                        defaultValue={selectedAction}
                        options={actionOptions}
                      />
                    );
                  }}
                />
                {form.getValues(`steps.${step.stepNumber - 1}.action`) === WorkflowActions.SMS_ATTENDEE && (
                  <p className="mt-2 ml-1 text-sm text-gray-500">{t("not_triggering_existing_bookings")}</p>
                )}
              </div>
              {isPhoneNumberNeeded && (
                <>
                  <label
                    htmlFor="sendTo"
                    className="mt-5 block text-sm font-medium text-gray-700 dark:text-white">
                    {t("phone_number")}
                  </label>
                  <div className="flex space-y-1">
                    <div className="mt-1 ">
                      <PhoneInput<FormValues>
                        control={form.control}
                        name={`steps.${step.stepNumber - 1}.sendTo`}
                        placeholder={t("enter_phone_number")}
                        id={`steps.${step.stepNumber - 1}.sendTo`}
                        className="rounded-md"
                        required
                      />
                      {form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo && (
                          <p className="mt-1 text-sm text-red-500">
                            {form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo?.message || ""}
                          </p>
                        )}
                    </div>
                  </div>
                </>
              )}
              <div className="mt-5">
                <label htmlFor="label" className="mt-5 block text-sm font-medium text-gray-700">
                  {t("choose_template")}
                </label>
                <Controller
                  name={`steps.${step.stepNumber - 1}.template`}
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="mt-3 block w-full min-w-0 flex-1 rounded-sm text-sm"
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
                <>
                  {isEmailSubjectNeeded && (
                    <div className="mt-5">
                      <label className="mt-3 mb-1 block text-sm font-medium text-gray-700">
                        {t("subject")}
                      </label>
                      <div className="border-1 focus-within:border-1 resize rounded-md border border-gray-300 bg-white text-sm focus-within:border-black">
                        <AddVariablesDropdown addVariable={addVariable} isEmailSubject={true} />
                        <TextArea
                          ref={(e) => {
                            emailSubjectFormRef(e);
                            refEmailSubject.current = e;
                          }}
                          className="my-0 block w-full rounded-sm border-0 p-2 text-sm focus:ring-0 focus:ring-offset-0"
                          required
                          {...restEmailSubjectForm}
                        />
                      </div>
                      {form.formState.errors.steps &&
                        form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject && (
                          <p className="mt-1 text-sm text-red-500">
                            {form.formState?.errors?.steps[step.stepNumber - 1]?.emailSubject?.message || ""}
                          </p>
                        )}
                    </div>
                  )}
                  <label className="mt-3 mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                    {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                  </label>
                  <div className="border-1 focus-within:border-1 resize rounded-md border border-gray-300 bg-white text-sm focus-within:border-black">
                    <AddVariablesDropdown addVariable={addVariable} isEmailSubject={false} />
                    <TextArea
                      ref={(e) => {
                        reminderBodyFormRef(e);
                        refReminderBody.current = e;
                      }}
                      className="my-0 block w-full rounded-sm border-0 p-2 text-sm focus:ring-0 focus:ring-offset-0"
                      required
                      {...restReminderBodyForm}
                    />
                  </div>
                  {form.formState.errors.steps &&
                    form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState?.errors?.steps[step.stepNumber - 1]?.reminderBody?.message || ""}
                      </p>
                    )}
                  <div className="mt-3 mb-5 ">
                    <button
                      className="flex"
                      type="button"
                      onClick={() => setIsInfoParagraphOpen(!isInfoParagraphOpen)}>
                      {isInfoParagraphOpen ? (
                        <Icon.FiChevronDown className="w5 h-5 text-gray-700" />
                      ) : (
                        <Icon.FiChevronRight className="w5 h-5 text-gray-700" />
                      )}
                      <span className="text-sm">{t("using_additional_inputs_as_variables")}</span>
                    </button>
                    {isInfoParagraphOpen && (
                      <div className="mt-4 ml-6 w-full pr-6 text-sm">
                        <div className="lg:flex">
                          <div className="lg:w-1/2">
                            <p className="font-medium">{t("example_1")}:</p>
                            <p>{`${t("additonal_input_label")}: ${t("company_size")}`}</p>
                            <p>{`${t("variable")}: {${t("company_size")
                              .replace(/[^a-zA-Z0-9 ]/g, "")
                              .trim()
                              .replace(/ /g, "_")
                              .toUpperCase()}}`}</p>
                          </div>
                          <div className="mt-3 lg:mt-0 lg:w-1/2">
                            <p className="font-medium">{t("example_2")}:</p>
                            <p>{`${t("additonal_input_label")}: ${t("what_help_needed")}`}</p>
                            <p>{`${t("variable")}: {${t("what_help_needed")
                              .replace(/[^a-zA-Z0-9 ]/g, "")
                              .trim()
                              .replace(/ /g, "_")
                              .toUpperCase()}}`}</p>
                          </div>
                        </div>
                        <p className="mt-4 font-medium">{t("variable_format")}:</p>
                        <p>{t("custom_input_as_variable_info")}</p>
                      </div>
                    )}
                  </div>
                </>
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
                    }

                    const isNumberValid =
                      form.formState.errors.steps &&
                      form.formState?.errors?.steps[step.stepNumber - 1]?.sendTo
                        ? false
                        : true;

                    if (isPhoneNumberNeeded && isNumberValid && !isEmpty) {
                      setConfirmationDialogOpen(true);
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
      </>
    );
  }

  return <></>;
}
