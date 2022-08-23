import {
  TimeUnit,
  WorkflowActions,
  WorkflowStep,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import Select from "@calcom/ui/form/Select";
import { TextArea } from "@calcom/ui/form/fields";

import { AddVariablesDropdown } from "../components/AddVariablesDropdown";
import {
  getWorkflowActionOptions,
  getWorkflowTemplateOptions,
  getWorkflowTimeUnitOptions,
  getWorkflowTriggerOptions,
} from "../lib/getOptions";
import { getTranslatedText, translateVariablesToEnglish } from "../lib/variableTranslations";
import type { FormValues } from "../pages/workflow";

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues>;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
  editCounter: number;
  setEditCounter: Dispatch<SetStateAction<number>>;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t, i18n } = useLocale();
  const { step, form, reload, setReload, editCounter, setEditCounter } = props;
  const [editNumberMode, setEditNumberMode] = useState(
    step?.action === WorkflowActions.SMS_NUMBER && !step?.sendTo ? true : false
  );
  const [editEmailBodyMode, setEditEmailBodyMode] = useState(false);
  const [sendTo, setSendTo] = useState(step?.sendTo || "");
  const [errorMessageNumber, setErrorMessageNumber] = useState("");
  const [errorMessageCustomInput, setErrorMessageCustomInput] = useState("");
  const [isInfoParagraphOpen, setIsInfoParagraphOpen] = useState(false);

  const [translatedReminderBody, setTranslatedReminderBody] = useState(
    getTranslatedText((step ? form.getValues(`steps.${step.stepNumber - 1}.reminderBody`) : "") || "", {
      locale: i18n.language,
      t,
    })
  );

  const [translatedSubject, setTranslatedSubject] = useState(
    getTranslatedText((step ? form.getValues(`steps.${step.stepNumber - 1}.emailSubject`) : "") || "", {
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
  const timeUnitOptions = getWorkflowTimeUnitOptions(t);
  const templateOptions = getWorkflowTemplateOptions(t);

  const { ref: emailSubjectFormRef } = form.register(`steps.${step ? step.stepNumber - 1 : 0}.emailSubject`);

  const { ref: reminderBodyFormRef } = form.register(`steps.${step ? step.stepNumber - 1 : 0}.reminderBody`);

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
        setTranslatedSubject(subjectWithAddedVariable);
      } else {
        const currentMessageBody = refReminderBody?.current?.value || "";
        const cursorPosition = refReminderBody?.current?.selectionStart || currentMessageBody.length;
        const messageWithAddedVariable = `${currentMessageBody.substring(0, cursorPosition)}{${variable
          .toUpperCase()
          .replace(" ", "_")}}${currentMessageBody.substring(cursorPosition)}`;
        setTranslatedReminderBody(messageWithAddedVariable);
      }
    }
  };

  //trigger
  if (!step) {
    const trigger = form.getValues("trigger");
    const timeUnit = form.getValues("timeUnit");

    const selectedTrigger = { label: t(`${trigger.toLowerCase()}_trigger`), value: trigger };
    const selectedTimeUnit = timeUnit
      ? { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit }
      : undefined;

    return (
      <>
        <div className="flex justify-center">
          <div className=" min-w-80 w-[50rem] rounded border-2 border-gray-400 bg-gray-50 px-10 pb-9 pt-5">
            <div className="font-bold">{t("triggers")}:</div>
            <Controller
              name="trigger"
              control={form.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    className="mt-3 block w-full min-w-0 flex-1 rounded-sm text-sm"
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
                <label htmlFor="label" className="mb-2 block text-sm font-medium text-gray-700">
                  {t("how_long_before")}
                </label>
                <div className="flex">
                  <input
                    type="number"
                    min="1"
                    defaultValue={form.getValues("time") || 24}
                    className="mr-5 block w-20 rounded-sm border-gray-300 px-3 py-2 text-sm marker:border focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                    {...form.register("time", { valueAsNumber: true })}
                  />
                  <div className="w-28">
                    <Controller
                      name="timeUnit"
                      control={form.control}
                      render={() => {
                        return (
                          <Select
                            isSearchable={false}
                            className="block min-w-0 flex-1 rounded-sm text-sm"
                            onChange={(val) => {
                              if (val) {
                                form.setValue("timeUnit", val.value);
                              }
                            }}
                            defaultValue={selectedTimeUnit || timeUnitOptions[1]}
                            options={timeUnitOptions}
                          />
                        );
                      }}
                    />
                  </div>
                </div>
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
        <div className="flex justify-center">
          <div className="h-10 border-l-2 border-gray-400" />
        </div>
        <div className="flex justify-center">
          <div className="min-w-80 flex w-[50rem] rounded border-2 border-gray-400 bg-gray-50 pl-10 pb-9 ">
            <div className="w-full pt-5">
              <div className="font-bold">{t("action")}:</div>
              <div>
                <Controller
                  name={`steps.${step.stepNumber - 1}.action`}
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="mt-3 block w-full min-w-0 flex-1 rounded-sm text-sm"
                        onChange={(val) => {
                          if (val) {
                            let counter = 0;
                            if (val.value === WorkflowActions.SMS_NUMBER) {
                              setIsPhoneNumberNeeded(true);
                              setEditNumberMode(true);
                              counter = counter + 1;
                            } else {
                              setIsPhoneNumberNeeded(false);
                              setEditNumberMode(false);
                            }

                            if (
                              form.getValues(`steps.${step.stepNumber - 1}.template`) ===
                              WorkflowTemplates.CUSTOM
                            ) {
                              setEditEmailBodyMode(true);
                              counter = counter + 1;
                            }

                            if (
                              val.value === WorkflowActions.EMAIL_ATTENDEE ||
                              val.value === WorkflowActions.EMAIL_HOST
                            ) {
                              setIsEmailSubjectNeeded(true);
                            } else {
                              setIsEmailSubjectNeeded(false);
                            }
                            setEditCounter(counter);
                            form.setValue(`steps.${step.stepNumber - 1}.action`, val.value);
                            setErrorMessageNumber("");
                            setErrorMessageCustomInput("");
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
                      <PhoneInput
                        international
                        value={sendTo}
                        onChange={(newValue) => {
                          if (newValue) {
                            setSendTo(newValue);
                            setErrorMessageNumber("");
                          }
                        }}
                        placeholder={t("enter_phone_number")}
                        id="sendTo"
                        disabled={!editNumberMode}
                        required
                        countrySelectProps={{ className: "text-black" }}
                        numberInputProps={{ className: "border-0 text-sm focus:ring-0 dark:bg-gray-700" }}
                        className={classNames(
                          "focus-within:border-brand order-1 block w-full rounded-sm border border-gray-300 py-px pl-3 ring-black focus-within:ring-1 disabled:text-gray-500 disabled:opacity-50 dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500",
                          !editNumberMode ? "text-gray-500 dark:text-gray-500" : ""
                        )}
                      />
                    </div>
                    {!editNumberMode ? (
                      <Button
                        type="button"
                        color="secondary"
                        onClick={() => {
                          setEditNumberMode(true);
                          setEditCounter(editCounter + 1);
                        }}>
                        {t("edit")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        color="primary"
                        onClick={async () => {
                          if (sendTo) {
                            form.setValue(`steps.${step.stepNumber - 1}.sendTo`, sendTo);
                            if (isValidPhoneNumber(sendTo)) {
                              setEditNumberMode(false);
                              setEditCounter(editCounter - 1);
                            } else {
                              setErrorMessageNumber(t("invalid_input"));
                            }
                          }
                        }}>
                        {t("save")}
                      </Button>
                    )}
                  </div>
                  {errorMessageNumber && <p className="mt-1 text-sm text-red-500">{errorMessageNumber}</p>}
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
                            if (isCustomTemplate) {
                              setEditEmailBodyMode(true);
                              setEditCounter(editCounter + 1);
                            } else if (editEmailBodyMode) {
                              setEditEmailBodyMode(false);
                              setEditCounter(editCounter - 1);
                            }

                            setErrorMessageCustomInput("");
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
                    <div className="mt-5 mb-2 ">
                      <label className="mt-3 mb-1 block text-sm font-medium text-gray-700">
                        {t("subject")}
                      </label>
                      <div className="mtext-sm border-1 focus-within:border-1 rounded-sm border border-gray-300 bg-white focus-within:border-black">
                        <AddVariablesDropdown
                          disabled={!editEmailBodyMode}
                          addVariable={addVariable}
                          isEmailSubject={true}
                        />
                        <TextArea
                          name="emailSubject"
                          disabled={!editEmailBodyMode}
                          ref={(e) => {
                            emailSubjectFormRef(e);
                            refEmailSubject.current = e;
                          }}
                          value={translatedSubject}
                          onChange={(e) => {
                            setTranslatedSubject(e.target.value);
                          }}
                          rows={1}
                          className={classNames(
                            "block w-full rounded-sm border-0 p-2 text-sm  focus:border-0 focus:ring-0 dark:border-black dark:bg-black dark:text-white",
                            !editEmailBodyMode ? "text-gray-500 dark:text-gray-500" : ""
                          )}
                        />
                      </div>
                    </div>
                  )}
                  <label className="mt-3 mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                    {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                  </label>
                  <div className="border-1 focus-within:border-1 mb-2 rounded-sm border border-gray-300 bg-white text-sm focus-within:border-black">
                    <AddVariablesDropdown
                      disabled={!editEmailBodyMode}
                      addVariable={addVariable}
                      isEmailSubject={false}
                    />
                    <TextArea
                      name="reminderBody"
                      disabled={!editEmailBodyMode}
                      ref={(e) => {
                        reminderBodyFormRef(e);
                        refReminderBody.current = e;
                      }}
                      value={translatedReminderBody}
                      onChange={(e) => {
                        setTranslatedReminderBody(e.target.value);
                      }}
                      rows={5}
                      className={classNames(
                        "block w-full rounded-sm border-0 p-2 text-sm  focus:border-0 focus:ring-0 dark:border-black dark:bg-black dark:text-white",
                        !editEmailBodyMode ? "text-gray-500 dark:text-gray-500" : ""
                      )}
                    />
                  </div>
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

                  {errorMessageCustomInput && (
                    <p className="mb-3 text-sm text-red-500">{errorMessageCustomInput}</p>
                  )}

                  {!editEmailBodyMode ? (
                    <Button
                      type="button"
                      color="secondary"
                      onClick={() => {
                        setEditEmailBodyMode(true);
                        setEditCounter(editCounter + 1);
                      }}>
                      {t("edit")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      color="primary"
                      onClick={async () => {
                        const reminderBody = form.getValues(`steps.${step.stepNumber - 1}.reminderBody`);
                        const emailSubject = form.getValues(`steps.${step.stepNumber - 1}.emailSubject`);
                        let isEmpty = false;
                        let errorMessage = "";

                        if (isEmailSubjectNeeded) {
                          if (!translatedReminderBody || !translatedSubject) {
                            isEmpty = true;
                            errorMessage = "Email body or subject is empty";
                          }
                        } else if (!translatedReminderBody) {
                          isEmpty = true;
                          errorMessage = "Text message is empty";
                        }
                        form.setValue(
                          `steps.${step.stepNumber - 1}.reminderBody`,
                          translateVariablesToEnglish(translatedReminderBody, { locale: i18n.language, t })
                        );
                        form.setValue(
                          `steps.${step.stepNumber - 1}.emailSubject`,
                          translateVariablesToEnglish(translatedSubject, { locale: i18n.language, t })
                        );
                        if (!isEmpty) {
                          setEditEmailBodyMode(false);
                          setEditCounter(editCounter - 1);
                        }
                        setErrorMessageCustomInput(errorMessage);
                      }}>
                      {t("save")}
                    </Button>
                  )}
                </>
              )}
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
                      color="warn"
                      size="sm"
                      StartIcon={Icon.FiTrash}
                      className="w-full rounded-none">
                      {t("delete")}
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <></>;
}
