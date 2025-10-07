import * as RadioGroup from "@radix-ui/react-radio-group";
import type { UnitTypeLongPlural } from "dayjs";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type z from "zod";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { EventTypeSetup, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import classNames from "@calcom/ui/classNames";
import { Select } from "@calcom/ui/components/form";
import { Input } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { RadioField } from "@calcom/ui/components/radio";

export type DisableReschedulingCustomClassNames = SettingsToggleClassNames & {
  radioGroupContainer?: string;
  alwaysDisabledRadio?: string;
  conditionalDisabledRadio?: {
    container?: string;
    timeInput?: string;
    timeUnitSelect?: string;
  };
};

type DisableReschedulingControllerProps = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  disableRescheduling: boolean;
  onDisableRescheduling: Dispatch<SetStateAction<boolean>>;
  eventType: EventTypeSetup;
  customClassNames?: DisableReschedulingCustomClassNames;
};

export default function DisableReschedulingController({
  metadata,
  eventType,
  disableRescheduling,
  onDisableRescheduling,
  customClassNames,
}: DisableReschedulingControllerProps) {
  const { t } = useLocale();
  const [disableReschedulingSetup, setDisableReschedulingSetup] = useState(
    metadata?.disableReschedulingThreshold
  );
  const defaultDisableReschedulingSetup = { time: 120, unit: "minutes" as UnitTypeLongPlural };
  const formMethods = useFormContext<FormValues>();

  useEffect(() => {
    if (!disableRescheduling) {
      formMethods.setValue("metadata.disableReschedulingThreshold", undefined, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableRescheduling]);

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });
  const disableReschedulingLockedProps = shouldLockDisableProps("disableRescheduling");

  const options = [
    { label: t("minute_timeUnit"), value: "minutes" },
    { label: t("hour_timeUnit"), value: "hours" },
  ];

  const defaultValue = options.find(
    (opt) =>
      opt.value === (metadata?.disableReschedulingThreshold?.unit ?? defaultDisableReschedulingSetup.unit)
  );

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="disableRescheduling"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                disableRescheduling && "rounded-b-none",
                customClassNames?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.children)}
              descriptionClassName={customClassNames?.description}
              title={t("disable_rescheduling")}
              data-testid="disable-rescheduling"
              disabled={disableReschedulingLockedProps.disabled}
              description={t("description_disable_rescheduling")}
              checked={disableRescheduling}
              LockedIcon={disableReschedulingLockedProps.LockedIcon}
              onCheckedChange={(val) => {
                formMethods.setValue("disableRescheduling", val, { shouldDirty: true });
                onDisableRescheduling(val);
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <RadioGroup.Root
                  defaultValue={
                    disableRescheduling
                      ? disableReschedulingSetup === undefined
                        ? "always"
                        : "notice"
                      : undefined
                  }
                  onValueChange={(val) => {
                    if (val === "always") {
                      formMethods.setValue("disableRescheduling", true, { shouldDirty: true });
                      onDisableRescheduling(true);
                      formMethods.setValue("metadata.disableReschedulingThreshold", undefined, {
                        shouldDirty: true,
                      });
                      setDisableReschedulingSetup(undefined);
                    } else if (val === "notice") {
                      formMethods.setValue("disableRescheduling", true, { shouldDirty: true });
                      onDisableRescheduling(true);
                      formMethods.setValue(
                        "metadata.disableReschedulingThreshold",
                        disableReschedulingSetup || defaultDisableReschedulingSetup,
                        { shouldDirty: true }
                      );
                    }
                  }}>
                  <div
                    className={classNames(
                      "flex flex-col flex-wrap justify-start gap-y-2",
                      customClassNames?.radioGroupContainer
                    )}>
                    {(disableReschedulingSetup === undefined ||
                      !disableReschedulingLockedProps.disabled) && (
                      <RadioField
                        label={t("always")}
                        disabled={disableReschedulingLockedProps.disabled}
                        id="always"
                        value="always"
                        className={customClassNames?.alwaysDisabledRadio}
                      />
                    )}
                    {(disableReschedulingSetup !== undefined ||
                      !disableReschedulingLockedProps.disabled) && (
                      <>
                        <RadioField
                          disabled={disableReschedulingLockedProps.disabled}
                          className={classNames(
                            "items-center",
                            customClassNames?.conditionalDisabledRadio?.container
                          )}
                          label={
                            <>
                              <ServerTrans
                                t={t}
                                i18nKey="when_less_than_x_mins_before_meeting"
                                components={[
                                  <div
                                    key="when_less_than_x_mins_before_meeting"
                                    className="mx-2 inline-flex items-center">
                                    <Input
                                      type="number"
                                      min={1}
                                      disabled={disableReschedulingLockedProps.disabled}
                                      onChange={(evt) => {
                                        const val = Number(evt.target?.value);
                                        setDisableReschedulingSetup({
                                          unit:
                                            disableReschedulingSetup?.unit ??
                                            defaultDisableReschedulingSetup.unit,
                                          time: val,
                                        });
                                        formMethods.setValue(
                                          "metadata.disableReschedulingThreshold.time",
                                          val,
                                          { shouldDirty: true }
                                        );
                                      }}
                                      className={classNames(
                                        "border-default h-9! !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r",
                                        customClassNames?.conditionalDisabledRadio?.timeInput
                                      )}
                                      defaultValue={metadata?.disableReschedulingThreshold?.time || 120}
                                    />
                                    <label
                                      className={classNames(
                                        disableReschedulingLockedProps.disabled && "cursor-not-allowed"
                                      )}>
                                      <Select
                                        inputId="notice"
                                        options={options}
                                        isSearchable={false}
                                        isDisabled={disableReschedulingLockedProps.disabled}
                                        className={
                                          customClassNames?.conditionalDisabledRadio?.timeUnitSelect
                                        }
                                        innerClassNames={{
                                          control: "rounded-l-none max-h-4 px-3 bg-subtle py-1",
                                        }}
                                        onChange={(opt) => {
                                          setDisableReschedulingSetup({
                                            time:
                                              disableReschedulingSetup?.time ??
                                              defaultDisableReschedulingSetup.time,
                                            unit: opt?.value as UnitTypeLongPlural,
                                          });
                                          formMethods.setValue(
                                            "metadata.disableReschedulingThreshold.unit",
                                            opt?.value as UnitTypeLongPlural,
                                            { shouldDirty: true }
                                          );
                                        }}
                                        defaultValue={defaultValue}
                                      />
                                    </label>
                                  </div>,
                                ]}
                              />
                            </>
                          }
                          id="notice"
                          value="notice"
                        />
                      </>
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
