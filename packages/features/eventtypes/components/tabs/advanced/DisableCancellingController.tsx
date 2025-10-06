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

export type DisableCancellingCustomClassNames = SettingsToggleClassNames & {
  radioGroupContainer?: string;
  alwaysDisabledRadio?: string;
  conditionalDisabledRadio?: {
    container?: string;
    timeInput?: string;
    timeUnitSelect?: string;
  };
};

type DisableCancellingControllerProps = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  disableCancelling: boolean;
  onDisableCancelling: Dispatch<SetStateAction<boolean>>;
  eventType: EventTypeSetup;
  customClassNames?: DisableCancellingCustomClassNames;
};

export default function DisableCancellingController({
  metadata,
  eventType,
  disableCancelling,
  onDisableCancelling,
  customClassNames,
}: DisableCancellingControllerProps) {
  const { t } = useLocale();
  const [disableCancellingSetup, setDisableCancellingSetup] = useState(
    metadata?.disableCancellingThreshold
  );
  const defaultDisableCancellingSetup = { time: 120, unit: "minutes" as UnitTypeLongPlural };
  const formMethods = useFormContext<FormValues>();

  useEffect(() => {
    if (!disableCancelling) {
      formMethods.setValue("metadata.disableCancellingThreshold", undefined, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableCancelling]);

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });
  const disableCancellingLockedProps = shouldLockDisableProps("disableCancelling");

  const options = [
    { label: t("minute_timeUnit"), value: "minutes" },
    { label: t("hour_timeUnit"), value: "hours" },
  ];

  const defaultValue = options.find(
    (opt) =>
      opt.value === (metadata?.disableCancellingThreshold?.unit ?? defaultDisableCancellingSetup.unit)
  );

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="disableCancelling"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                disableCancelling && "rounded-b-none",
                customClassNames?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.children)}
              descriptionClassName={customClassNames?.description}
              title={t("disable_cancelling")}
              data-testid="disable-cancelling"
              disabled={disableCancellingLockedProps.disabled}
              description={t("description_disable_cancelling")}
              checked={disableCancelling}
              LockedIcon={disableCancellingLockedProps.LockedIcon}
              onCheckedChange={(val) => {
                formMethods.setValue("disableCancelling", val, { shouldDirty: true });
                onDisableCancelling(val);
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <RadioGroup.Root
                  defaultValue={
                    disableCancelling
                      ? disableCancellingSetup === undefined
                        ? "always"
                        : "notice"
                      : undefined
                  }
                  onValueChange={(val) => {
                    if (val === "always") {
                      formMethods.setValue("disableCancelling", true, { shouldDirty: true });
                      onDisableCancelling(true);
                      formMethods.setValue("metadata.disableCancellingThreshold", undefined, {
                        shouldDirty: true,
                      });
                      setDisableCancellingSetup(undefined);
                    } else if (val === "notice") {
                      formMethods.setValue("disableCancelling", true, { shouldDirty: true });
                      onDisableCancelling(true);
                      formMethods.setValue(
                        "metadata.disableCancellingThreshold",
                        disableCancellingSetup || defaultDisableCancellingSetup,
                        { shouldDirty: true }
                      );
                    }
                  }}>
                  <div
                    className={classNames(
                      "flex flex-col flex-wrap justify-start gap-y-2",
                      customClassNames?.radioGroupContainer
                    )}>
                    {(disableCancellingSetup === undefined || !disableCancellingLockedProps.disabled) && (
                      <RadioField
                        label={t("always")}
                        disabled={disableCancellingLockedProps.disabled}
                        id="always"
                        value="always"
                        className={customClassNames?.alwaysDisabledRadio}
                      />
                    )}
                    {(disableCancellingSetup !== undefined || !disableCancellingLockedProps.disabled) && (
                      <>
                        <RadioField
                          disabled={disableCancellingLockedProps.disabled}
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
                                      disabled={disableCancellingLockedProps.disabled}
                                      onChange={(evt) => {
                                        const val = Number(evt.target?.value);
                                        setDisableCancellingSetup({
                                          unit:
                                            disableCancellingSetup?.unit ??
                                            defaultDisableCancellingSetup.unit,
                                          time: val,
                                        });
                                        formMethods.setValue(
                                          "metadata.disableCancellingThreshold.time",
                                          val,
                                          { shouldDirty: true }
                                        );
                                      }}
                                      className={classNames(
                                        "border-default h-9! !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r",
                                        customClassNames?.conditionalDisabledRadio?.timeInput
                                      )}
                                      defaultValue={metadata?.disableCancellingThreshold?.time || 120}
                                    />
                                    <label
                                      className={classNames(
                                        disableCancellingLockedProps.disabled && "cursor-not-allowed"
                                      )}>
                                      <Select
                                        inputId="notice"
                                        options={options}
                                        isSearchable={false}
                                        isDisabled={disableCancellingLockedProps.disabled}
                                        className={
                                          customClassNames?.conditionalDisabledRadio?.timeUnitSelect
                                        }
                                        innerClassNames={{
                                          control: "rounded-l-none max-h-4 px-3 bg-subtle py-1",
                                        }}
                                        onChange={(opt) => {
                                          setDisableCancellingSetup({
                                            time:
                                              disableCancellingSetup?.time ??
                                              defaultDisableCancellingSetup.time,
                                            unit: opt?.value as UnitTypeLongPlural,
                                          });
                                          formMethods.setValue(
                                            "metadata.disableCancellingThreshold.unit",
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
