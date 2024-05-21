import * as RadioGroup from "@radix-ui/react-radio-group";
import { Trans } from "next-i18next";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextField, SettingsToggle, RadioField } from "@calcom/ui";

type RescheduleOptionControllerProps = {
  eventType: EventTypeSetup;
};

export default function RescheduleOptionController({ eventType }: RescheduleOptionControllerProps) {
  const { t } = useLocale();
  const defaultallSetup = { time: 0 };
  const [flexibleSetup, setFlexibleSetup] = useState(defaultallSetup);
  const [strictSetup, setStrictSetup] = useState(defaultallSetup);
  const formMethods = useFormContext<FormValues>();

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });
  const rescheduleOptionLockedProps = shouldLockDisableProps("rescheduleOption");
  const [rescheduleOptionToggle, setrescheduleOptionToggle] = useState(
    !!formMethods.getValues("rescheduleOption")
  );

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="rescheduleOption"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                rescheduleOptionToggle && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              title={t("enable_reschedule_options")}
              data-testid="reschedule-Option"
              disabled={rescheduleOptionLockedProps.disabled}
              description={t("enable_reschedule_options_description")}
              checked={rescheduleOptionToggle}
              LockedIcon={rescheduleOptionLockedProps.LockedIcon}
              onCheckedChange={(val) => {
                setrescheduleOptionToggle(val);
                if (!val) {
                  formMethods.setValue("rescheduleOption", undefined, {
                    shouldDirty: true,
                  });
                }
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <RadioGroup.Root
                  defaultValue="strict"
                  onValueChange={(val) => {
                    if (val === "flexible") {
                      setrescheduleOptionToggle(true);
                      formMethods.setValue(
                        "rescheduleOption",
                        { type: "flexible", timestamp: flexibleSetup.time },
                        {
                          shouldDirty: true,
                        }
                      );
                    } else if (val === "strict") {
                      formMethods.setValue(
                        "rescheduleOption",
                        { type: "strict", timestamp: strictSetup.time },
                        {
                          shouldDirty: true,
                        }
                      );
                      setrescheduleOptionToggle(true);
                    }
                  }}>
                  <div className="flex flex-col flex-wrap justify-start gap-y-2">
                    {!rescheduleOptionLockedProps.disabled && (
                      <RadioField
                        disabled={rescheduleOptionLockedProps.disabled}
                        className="items-center"
                        label={
                          <>
                            <Trans
                              i18nKey="reschedule_within_grace_period"
                              defaults="Allow reschedule within a grace period of after <time></time> start time"
                              components={{
                                time: (
                                  <div className="mx-2 inline-flex">
                                    <TextField
                                      type="number"
                                      min={1}
                                      disabled={rescheduleOptionLockedProps.disabled}
                                      onChange={(evt) => {
                                        const val = Number(evt.target?.value);
                                        setFlexibleSetup({
                                          time: val,
                                        });
                                        formMethods.setValue(
                                          "rescheduleOption",
                                          { type: "flexible", timestamp: val },
                                          { shouldDirty: true }
                                        );
                                      }}
                                      className="border-default !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r"
                                      defaultValue={0}
                                      addOnSuffix={<>{t("minutes")}</>}
                                    />
                                  </div>
                                ),
                              }}
                            />
                          </>
                        }
                        id="flexible"
                        value="flexible"
                      />
                    )}
                    {!rescheduleOptionLockedProps.disabled && (
                      <RadioField
                        disabled={rescheduleOptionLockedProps.disabled}
                        className="items-center"
                        label={
                          <>
                            <Trans
                              i18nKey="reschedule_up_to_hours_before"
                              defaults="Only allow reschedule up to <time></time> before start time"
                              components={{
                                time: (
                                  <div className="mx-2 inline-flex">
                                    <TextField
                                      required
                                      type="number"
                                      min={1}
                                      disabled={rescheduleOptionLockedProps.disabled}
                                      onChange={(evt) => {
                                        const val = Number(evt.target?.value);
                                        setStrictSetup({
                                          time: val,
                                        });
                                        formMethods.setValue(
                                          "rescheduleOption",
                                          { type: "strict", timestamp: val },
                                          { shouldDirty: true }
                                        );
                                      }}
                                      defaultValue={0}
                                      className="border-default !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r"
                                      addOnSuffix={<>{t("hours")}</>}
                                    />
                                  </div>
                                ),
                              }}
                            />
                          </>
                        }
                        id="strict"
                        value="strict"
                      />
                    )}
                  </div>
                </RadioGroup.Root>
              </div>
            </SettingsToggle>
          )}
        />
      </div>
    </div>
  );
}
