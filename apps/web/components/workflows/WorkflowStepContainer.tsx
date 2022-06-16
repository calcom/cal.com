import { DotsHorizontalIcon, TrashIcon } from "@heroicons/react/solid";
import { TimeUnit, WorkflowStep, WorkflowTriggerEvents } from "@prisma/client";
import { WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { FormValues } from "pages/workflows/[workflow]";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import PhoneInput from "react-phone-number-input";

import { Button } from "@calcom/ui";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import Select from "@calcom/ui/form/Select";
import { TextField, TextArea } from "@calcom/ui/form/fields";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";
import { TIME_UNIT, WORKFLOW_ACTIONS, WORKFLOW_TRIGGER_EVENTS } from "@lib/workflows/constants";

import CheckboxField from "@components/ui/form/CheckboxField";

type WorkflowStepProps = {
  trigger?: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  step?: WorkflowStep;
  form: UseFormReturn<FormValues, any>;
  setIsEditMode?: Dispatch<SetStateAction<boolean>>;
  reload?: boolean;
  setReload?: Dispatch<SetStateAction<boolean>>;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t } = useLocale();
  const { step, trigger, timeUnit, form, setIsEditMode, reload, setReload } = props;
  const [isPhoneNumberNeeded, setIsPhoneNumberNeeded] = useState(
    step?.action === WorkflowActions.SMS_NUMBER ? true : false
  );
  const [isCustomReminderBodyNeeded, setIsCustomReminderBodyNeeded] = useState(
    step?.reminderBody ? true : false
  );
  const [editNumberMode, setEditNumberMode] = useState(step?.sendTo ? false : true);
  const [editEmailBodyMode, setEditEmailBodyMode] = useState(false);
  const [sendTo, setSendTo] = useState(step?.sendTo || "");
  const [emailBody, setEmailBody] = useState<string | null>(step?.reminderBody || null);
  const [emailSubject, setEmailSubject] = useState<string | null>(step?.emailSubject || null);

  const [errorMessage, setErrorMessage] = useState("");

  const [showTimeSection, setShowTimeSection] = useState(
    trigger === WorkflowTriggerEvents.BEFORE_EVENT ? true : false
  );

  const actions = WORKFLOW_ACTIONS.map((action) => {
    return { label: t(`${action.toLowerCase()}_action`), value: action };
  });

  const triggers = WORKFLOW_TRIGGER_EVENTS.map((triggerEvent) => {
    return { label: t(`${triggerEvent.toLowerCase()}_trigger`), value: triggerEvent };
  });

  const timeUnits = TIME_UNIT.map((timeUnit) => {
    return { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit };
  });

  const setEditMode = (state: boolean, setEditModeFunction: (value: SetStateAction<boolean>) => void) => {
    if (setIsEditMode) {
      setIsEditMode(state);
    }
    setEditModeFunction(state);
  };

  //make overall design reusable
  if (trigger) {
    const selectedTrigger = { label: t(`${trigger.toLowerCase()}_trigger`), value: trigger };
    const selectedTimeUnit = timeUnit
      ? { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit }
      : undefined;

    return (
      <>
        <div className="flex justify-center">
          <div className=" w-[50rem] rounded border-2 border-gray-400 bg-gray-50 px-10 pb-9 pt-5">
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
                    options={triggers}
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
                    className="mr-5 block w-32 rounded-sm border-gray-300 px-3 py-2 shadow-sm marker:border focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800 sm:text-sm"
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
                            className="block min-w-0 flex-1 rounded-sm sm:text-sm"
                            onChange={(val) => {
                              if (val) {
                                form.setValue("timeUnit", val.value);
                              }
                            }}
                            defaultValue={selectedTimeUnit || timeUnits[1]}
                            options={timeUnits}
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

  if (step) {
    const selectedAction = { label: t(`${step.action.toLowerCase()}_action`), value: step.action };

    return (
      <>
        <div className="flex justify-center">
          <div className="h-10 border-l-2 border-gray-400" />
        </div>
        <div className="flex justify-center">
          <div className="flex w-[50rem] rounded border-2 border-gray-400 bg-gray-50 pl-10 pb-9 ">
            <div className="w-full pt-5">
              <div className="font-bold">{t("action")}:</div>
              <div>
                <Controller
                  name="steps"
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="mt-3 block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
                        onChange={(val) => {
                          if (val) {
                            const steps = form.getValues("steps");
                            if (val.value === WorkflowActions.SMS_NUMBER) {
                              setIsPhoneNumberNeeded(true);
                            } else {
                              setIsPhoneNumberNeeded(false);
                            }
                            const updatedSteps = steps?.map((currStep) => {
                              if (currStep.id === step.id) {
                                currStep.action = val.value;
                              }
                              return currStep;
                            });
                            form.setValue("steps", updatedSteps);
                          }
                        }}
                        defaultValue={selectedAction}
                        options={actions}
                      />
                    );
                  }}
                />
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
                          setSendTo(newValue || "");
                          setErrorMessage("");
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
                        onClick={() => setEditMode(true, setEditNumberMode)}>
                        {t("edit")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        color="primary"
                        onClick={async () => {
                          if (sendTo) {
                            const steps = form.getValues("steps");
                            const updatedSteps = steps?.map((currStep) => {
                              if (currStep.id === step.id) {
                                currStep.sendTo = sendTo;
                              }
                              return currStep;
                            });
                            form.setValue("steps", updatedSteps); //what to do when invalid phone input
                            if (isValidPhoneNumber(sendTo)) {
                              setEditMode(false, setEditNumberMode);
                            } else {
                              setErrorMessage("Invalid input"); //internationalization
                            }
                          }
                        }}>
                        {t("save")}
                      </Button>
                    )}
                  </div>
                  {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
                </>
              )}
              {trigger === WorkflowActions.EMAIL_ATTENDEE ||
                (WorkflowActions.EMAIL_HOST && (
                  <div className="mt-5">
                    <CheckboxField
                      id="customReminderBody"
                      descriptionAsLabel
                      name="customReminderBody"
                      label={t("custom_email")}
                      description=""
                      defaultChecked={step.reminderBody ? true : false}
                      onChange={(e) => {
                        setIsCustomReminderBodyNeeded(e?.target.checked);
                        setEditMode(e.target.checked, setEditEmailBodyMode);
                        if (!e.target.checked && step.reminderBody) {
                          setEmailBody(null);
                          const steps = form.getValues("steps");
                          const updatedSteps = steps?.map((currStep) => {
                            if (currStep.id === step.id) {
                              currStep.reminderBody = null;
                            }
                            return currStep;
                          });
                          form.setValue("steps", updatedSteps); //what to do when invalid phone input
                        }
                      }}
                    />
                  </div>
                ))}
              {isCustomReminderBodyNeeded && (
                <>
                  <div className="mt-5 mb-2">
                    <TextField
                      label={t("subject")}
                      required
                      type="text"
                      className={classNames(
                        "border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 px-2 text-sm shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white",
                        !editEmailBodyMode ? "text-gray-500 dark:text-gray-500" : ""
                      )}
                      value={emailSubject || ""}
                      onChange={(e) => {
                        setEmailSubject(e.target.value);
                      }}
                      name="emailSubject"
                    />
                    <label className="mt-3 mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                      {t("email_body")}
                    </label>
                    <TextArea
                      required
                      className={classNames(
                        "border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 py-px pt-2 text-sm shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white",
                        !editEmailBodyMode ? "text-gray-500 dark:text-gray-500" : ""
                      )}
                      rows={5}
                      value={emailBody || ""}
                      disabled={!editEmailBodyMode}
                      onChange={(e) => {
                        setEmailBody(e.target.value);
                      }}
                      name="emailBody"
                    />
                  </div>
                  {errorMessage && <p className="mb-3 text-sm text-red-500">{errorMessage}</p>}

                  {!editEmailBodyMode ? (
                    <Button
                      type="button"
                      color="secondary"
                      onClick={() => setEditMode(true, setEditEmailBodyMode)}>
                      {t("edit")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      color="primary"
                      onClick={async () => {
                        if (emailBody && emailSubject) {
                          const steps = form.getValues("steps");
                          const updatedSteps = steps?.map((currStep) => {
                            if (currStep.id === step.id) {
                              currStep.reminderBody = emailBody;
                              currStep.emailSubject = emailSubject;
                            }
                            return currStep;
                          });
                          form.setValue("steps", updatedSteps); //what to do when invalid phone input
                          setEditMode(false, setEditEmailBodyMode);
                          setErrorMessage(""); //internationalization
                        } else {
                          setErrorMessage("Email body or subject is empty"); //internationalization
                        }
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
                        const updatedSteps = steps?.filter((currStep) => currStep.id !== step.id);
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
