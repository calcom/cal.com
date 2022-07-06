import { DotsHorizontalIcon, TrashIcon } from "@heroicons/react/solid";
import {
  TimeUnit,
  WorkflowStep,
  WorkflowTriggerEvents,
  WorkflowActions,
  WorkflowTemplates,
} from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import PhoneInput from "react-phone-number-input";

import { Button } from "@calcom/ui";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import Select from "@calcom/ui/form/Select";
import { TextField, TextArea } from "@calcom/ui/form/fields";
import { FormValues } from "@ee/components/workflows/WorkflowDetailsPage";
import {
  getWorkflowActionOptions,
  getWorkflowTemplateOptions,
  getWorkflowTimeUnitOptions,
  getWorkflowTriggerOptions,
} from "@ee/lib/workflows/getOptions";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

type WorkflowStepProps = {
  step?: WorkflowStep;
  form: UseFormReturn<FormValues, any>;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t } = useLocale();
  const { step, form, setIsEditMode, reload, setReload } = props;

  const [editNumberMode, setEditNumberMode] = useState(
    step?.action === WorkflowActions.SMS_NUMBER && !step?.sendTo ? true : false
  );
  const [editEmailBodyMode, setEditEmailBodyMode] = useState(false);
  const [sendTo, setSendTo] = useState(step?.sendTo || "");
  const [errorMessageNumber, setErrorMessageNumber] = useState("");
  const [errorMessageCustomInput, setErrorMessageCustomInput] = useState("");

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

  const setEditMode = (
    state: boolean,
    setEditModeFunction: (value: SetStateAction<boolean>) => void,
    isAlreadyEditMode: boolean
  ) => {
    setEditModeFunction(state);
    if (!state && !isAlreadyEditMode) {
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
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
                    className="mt-3 block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
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
                    className="mr-5 block w-20 rounded-sm border-gray-300 px-3 py-2 text-sm shadow-sm marker:border focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
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
                            className="block min-w-0 flex-1 rounded-sm"
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
                        className="mt-3 block w-full min-w-0 flex-1 rounded-sm"
                        onChange={(val) => {
                          if (val) {
                            if (val.value === WorkflowActions.SMS_NUMBER) {
                              setIsPhoneNumberNeeded(true);
                              setEditMode(true, setEditNumberMode, editEmailBodyMode);
                            } else {
                              setIsPhoneNumberNeeded(false);
                              setEditMode(false, setEditNumberMode, editEmailBodyMode);
                            }

                            if (
                              val.value === WorkflowActions.EMAIL_ATTENDEE ||
                              val.value === WorkflowActions.EMAIL_HOST
                            ) {
                              setIsEmailSubjectNeeded(true);
                              if (!form.getValues(`steps.${step.stepNumber - 1}.emailSubject`)) {
                                setEditMode(true, setEditEmailBodyMode, editNumberMode);
                              }
                            } else {
                              setIsEmailSubjectNeeded(false);
                            }
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
                        className={classNames(
                          "border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 py-px pl-3 shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white",
                          !editNumberMode ? "text-gray-500 dark:text-gray-500" : ""
                        )}
                      />
                    </div>
                    {!editNumberMode ? (
                      <Button
                        type="button"
                        color="secondary"
                        onClick={() => setEditMode(true, setEditNumberMode, editEmailBodyMode)}>
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
                              setEditMode(false, setEditNumberMode, editEmailBodyMode);
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
                        className="mt-3 block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
                        onChange={(val) => {
                          if (val) {
                            form.setValue(`steps.${step.stepNumber - 1}.template`, val.value);
                            const isCustomTemplate = val.value === WorkflowTemplates.CUSTOM;
                            setIsCustomReminderBodyNeeded(isCustomTemplate);
                            setEditMode(isCustomTemplate, setEditEmailBodyMode, editNumberMode);
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
                    <div className="mt-5 mb-2">
                      <TextField
                        label={t("subject")}
                        type="text"
                        disabled={!editEmailBodyMode}
                        className={classNames(
                          "border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 px-2 font-sans text-sm shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white",
                          !editEmailBodyMode ? "text-gray-500 dark:text-gray-500" : ""
                        )}
                        {...form.register(`steps.${step.stepNumber - 1}.emailSubject`)}
                      />
                    </div>
                  )}
                  <label className="mt-3 mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                    {isEmailSubjectNeeded ? t("email_body") : t("text_message")}
                  </label>
                  <TextArea
                    className={classNames(
                      "border-1 focus-within:border-brand mb-2 block w-full rounded-sm border border-gray-300 p-2 text-sm shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white",
                      !editEmailBodyMode ? "text-gray-500 dark:text-gray-500" : ""
                    )}
                    rows={5}
                    disabled={!editEmailBodyMode}
                    {...form.register(`steps.${step.stepNumber - 1}.reminderBody`)}
                  />

                  {errorMessageCustomInput && (
                    <p className="mb-3 text-sm text-red-500">{errorMessageCustomInput}</p>
                  )}

                  {!editEmailBodyMode ? (
                    <Button
                      type="button"
                      color="secondary"
                      onClick={() => setEditMode(true, setEditEmailBodyMode, editNumberMode)}>
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
                          if (!reminderBody || !emailSubject) {
                            isEmpty = true;
                            errorMessage = "Email body or subject is empty";
                          }
                        } else if (!reminderBody) {
                          isEmpty = true;
                          errorMessage = "Text message is empty";
                        }

                        if (!isEmpty) {
                          setEditMode(false, setEditEmailBodyMode, editNumberMode);
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
                <DropdownMenuTrigger className="h-10 w-10 cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900 focus:border-gray-300">
                  <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
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
                      StartIcon={TrashIcon}
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
