import { ArrowDownIcon } from "@heroicons/react/outline";
import { TimeUnit, WorkflowStep, WorkflowTriggerEvents } from "@prisma/client";
import { FormValues } from "pages/workflows/[workflow]";
import { useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";

import Select from "@calcom/ui/form/Select";

import { useLocale } from "@lib/hooks/useLocale";
import { TIME_UNIT, WORKFLOW_ACTIONS, WORKFLOW_TRIGGER_EVENTS } from "@lib/workflows/constants";

type WorkflowStepProps = {
  trigger?: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  step?: WorkflowStep;
  form: UseFormReturn<FormValues, any>;
};

export default function WorkflowStepContainer(props: WorkflowStepProps) {
  const { t } = useLocale();
  const { step, trigger, time, timeUnit, form } = props;
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

  //make overall design reusable
  if (trigger) {
    const selectedTrigger = { label: t(`${trigger.toLowerCase()}_trigger`), value: trigger };
    const selectedTimeUnit = timeUnit
      ? { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit }
      : undefined;

    return (
      <>
        <div className="flex justify-center">
          <div className=" mt-0 w-[50rem] rounded border-2 bg-gray-100 px-10 pb-9 pt-5 sm:mt-5">
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
              <div className="mt-5 mb-4 space-y-1">
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
        <div className="flex justify-center">
          <ArrowDownIcon className="mt-2 h-8 stroke-[1.5px] text-gray-500 sm:mt-5" />
        </div>
      </>
    );
  }

  if (step) {
    const selectedAction = { label: t(`${step.action.toLowerCase()}_action`), value: step.action };

    return (
      <>
        <div className="flex justify-center">
          <div className=" mt-3 w-[50rem] rounded border-2 bg-gray-100 px-10 pb-9 pt-5 sm:mt-5">
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
          </div>
        </div>
        <div className="mt-2 flex justify-center sm:mt-5">
          <ArrowDownIcon className="h-8 stroke-[1.5px] text-gray-500" />
        </div>
      </>
    );
  }

  return <></>;
}
