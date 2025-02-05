import * as RadioGroup from "@radix-ui/react-radio-group";
import type { UnitTypeLongPlural } from "dayjs";
import { Trans } from "next-i18next";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type z from "zod";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { EventTypeSetup, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Input, SettingsToggle, RadioField, Select, CheckboxField } from "@calcom/ui";

export type RequiresConfirmationCustomClassNames = SettingsToggleClassNames & {
  radioGroupContainer?: string;
  alwaysConfirmationRadio?: string;
  conditionalConfirmationRadio?: {
    container?: string;
    timeInput?: string;
    timeUnitSelect?: string;
    checkbox?: string;
    checkboxDescription?: string;
  };
};

type RequiresConfirmationControllerProps = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  requiresConfirmation: boolean;
  requiresConfirmationWillBlockSlot: boolean;
  onRequiresConfirmation: Dispatch<SetStateAction<boolean>>;
  seatsEnabled: boolean;
  eventType: EventTypeSetup;
  customClassNames?: RequiresConfirmationCustomClassNames;
};

export default function RequiresConfirmationController({
  metadata,
  eventType,
  requiresConfirmation,
  onRequiresConfirmation,
  seatsEnabled,
  customClassNames,
}: RequiresConfirmationControllerProps) {
  const { t } = useLocale();
  const [requiresConfirmationSetup, setRequiresConfirmationSetup] = useState(
    metadata?.requiresConfirmationThreshold
  );
  const defaultRequiresConfirmationSetup = { time: 30, unit: "minutes" as UnitTypeLongPlural };
  const formMethods = useFormContext<FormValues>();

  useEffect(() => {
    if (!requiresConfirmation) {
      formMethods.setValue("metadata.requiresConfirmationThreshold", undefined, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresConfirmation]);

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });
  const requiresConfirmationLockedProps = shouldLockDisableProps("requiresConfirmation");

  const options = [
    { label: t("minute_timeUnit"), value: "minutes" },
    { label: t("hour_timeUnit"), value: "hours" },
  ];

  const defaultValue = options.find(
    (opt) =>
      opt.value === (metadata?.requiresConfirmationThreshold?.unit ?? defaultRequiresConfirmationSetup.unit)
  );

  const requiresConfirmationWillBlockSlot = formMethods.getValues("requiresConfirmationWillBlockSlot");
  const requiresConfirmationForFreeEmail = formMethods.getValues("requiresConfirmationForFreeEmail");

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="requiresConfirmation"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                requiresConfirmation && "rounded-b-none",
                customClassNames?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.children)}
              descriptionClassName={customClassNames?.description}
              title={t("requires_confirmation")}
              data-testid="requires-confirmation"
              disabled={seatsEnabled || requiresConfirmationLockedProps.disabled}
              tooltip={seatsEnabled ? t("seat_options_doesnt_support_confirmation") : undefined}
              description={t("requires_confirmation_description")}
              checked={requiresConfirmation}
              LockedIcon={requiresConfirmationLockedProps.LockedIcon}
              onCheckedChange={(val) => {
                formMethods.setValue("requiresConfirmation", val, { shouldDirty: true });
                // If we uncheck requires confirmation, we also uncheck the "will block slot" checkbox
                if (!val) {
                  formMethods.setValue("requiresConfirmationWillBlockSlot", false, { shouldDirty: true });
                }
                onRequiresConfirmation(val);
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <RadioGroup.Root
                  defaultValue={
                    requiresConfirmation
                      ? requiresConfirmationSetup === undefined
                        ? "always"
                        : "notice"
                      : undefined
                  }
                  onValueChange={(val) => {
                    if (val === "always") {
                      formMethods.setValue("requiresConfirmation", true, { shouldDirty: true });
                      onRequiresConfirmation(true);
                      formMethods.setValue("metadata.requiresConfirmationThreshold", undefined, {
                        shouldDirty: true,
                      });
                      setRequiresConfirmationSetup(undefined);
                    } else if (val === "notice") {
                      formMethods.setValue("requiresConfirmation", true, { shouldDirty: true });
                      onRequiresConfirmation(true);
                      formMethods.setValue(
                        "metadata.requiresConfirmationThreshold",
                        requiresConfirmationSetup || defaultRequiresConfirmationSetup,
                        { shouldDirty: true }
                      );
                    }
                  }}>
                  <div
                    className={classNames(
                      "flex flex-col flex-wrap justify-start gap-y-2",
                      customClassNames?.radioGroupContainer
                    )}>
                    {(requiresConfirmationSetup === undefined ||
                      !requiresConfirmationLockedProps.disabled) && (
                      <RadioField
                        label={t("always_requires_confirmation")}
                        disabled={requiresConfirmationLockedProps.disabled}
                        id="always"
                        value="always"
                        className={customClassNames?.alwaysConfirmationRadio}
                      />
                    )}
                    {(requiresConfirmationSetup !== undefined ||
                      !requiresConfirmationLockedProps.disabled) && (
                      <>
                        <RadioField
                          disabled={requiresConfirmationLockedProps.disabled}
                          className={classNames(
                            "items-center",
                            customClassNames?.conditionalConfirmationRadio?.container
                          )}
                          label={
                            <>
                              <Trans
                                i18nKey="when_booked_with_less_than_notice"
                                defaults="When booked with less than <time></time> notice"
                                components={{
                                  time: (
                                    <div className="mx-2 inline-flex">
                                      <Input
                                        type="number"
                                        min={1}
                                        disabled={requiresConfirmationLockedProps.disabled}
                                        onChange={(evt) => {
                                          const val = Number(evt.target?.value);
                                          setRequiresConfirmationSetup({
                                            unit:
                                              requiresConfirmationSetup?.unit ??
                                              defaultRequiresConfirmationSetup.unit,
                                            time: val,
                                          });
                                          formMethods.setValue(
                                            "metadata.requiresConfirmationThreshold.time",
                                            val,
                                            { shouldDirty: true }
                                          );
                                        }}
                                        className={classNames(
                                          "border-default !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r",
                                          customClassNames?.conditionalConfirmationRadio?.timeInput
                                        )}
                                        defaultValue={metadata?.requiresConfirmationThreshold?.time || 30}
                                      />
                                      <label
                                        className={classNames(
                                          requiresConfirmationLockedProps.disabled && "cursor-not-allowed"
                                        )}>
                                        <Select
                                          inputId="notice"
                                          options={options}
                                          isSearchable={false}
                                          isDisabled={requiresConfirmationLockedProps.disabled}
                                          className={
                                            customClassNames?.conditionalConfirmationRadio?.timeUnitSelect
                                          }
                                          innerClassNames={{ control: "rounded-l-none bg-subtle" }}
                                          onChange={(opt) => {
                                            setRequiresConfirmationSetup({
                                              time:
                                                requiresConfirmationSetup?.time ??
                                                defaultRequiresConfirmationSetup.time,
                                              unit: opt?.value as UnitTypeLongPlural,
                                            });
                                            formMethods.setValue(
                                              "metadata.requiresConfirmationThreshold.unit",
                                              opt?.value as UnitTypeLongPlural,
                                              { shouldDirty: true }
                                            );
                                          }}
                                          defaultValue={defaultValue}
                                        />
                                      </label>
                                    </div>
                                  ),
                                }}
                              />
                            </>
                          }
                          id="notice"
                          value="notice"
                        />
                        <CheckboxField
                          checked={requiresConfirmationWillBlockSlot}
                          descriptionAsLabel
                          description={t("requires_confirmation_will_block_slot_description")}
                          className={customClassNames?.conditionalConfirmationRadio?.checkbox}
                          descriptionClassName={
                            customClassNames?.conditionalConfirmationRadio?.checkboxDescription
                          }
                          onChange={(e) => {
                            // We set should dirty to properly detect when we can submit the form
                            formMethods.setValue("requiresConfirmationWillBlockSlot", e.target.checked, {
                              shouldDirty: true,
                            });
                          }}
                        />
                        <CheckboxField
                          checked={requiresConfirmationForFreeEmail}
                          descriptionAsLabel
                          description={t("require_confirmation_for_free_email")}
                          className={customClassNames?.conditionalConfirmationRadio?.checkbox}
                          descriptionClassName={
                            customClassNames?.conditionalConfirmationRadio?.checkboxDescription
                          }
                          onChange={(e) => {
                            // We set should dirty to properly detect when we can submit the form
                            formMethods.setValue("requiresConfirmationForFreeEmail", e.target.checked, {
                              shouldDirty: true,
                            });
                          }}
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
