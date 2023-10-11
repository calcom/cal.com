import * as RadioGroup from "@radix-ui/react-radio-group";
import type { UnitTypeLongPlural } from "dayjs";
import { Trans } from "next-i18next";
import type { EventTypeSetup, FormValues } from "pages/event-types/[type]";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type z from "zod";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Input, SettingsToggle, RadioField, Select } from "@calcom/ui";

type RequiresConfirmationControllerProps = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  requiresConfirmation: boolean;
  onRequiresConfirmation: Dispatch<SetStateAction<boolean>>;
  seatsEnabled: boolean;
  eventType: EventTypeSetup;
};

export default function RequiresConfirmationController({
  metadata,
  eventType,
  requiresConfirmation,
  onRequiresConfirmation,
  seatsEnabled,
}: RequiresConfirmationControllerProps) {
  const { t } = useLocale();
  const [requiresConfirmationSetup, setRequiresConfirmationSetup] = useState(
    metadata?.requiresConfirmationThreshold
  );
  const defaultRequiresConfirmationSetup = { time: 30, unit: "minutes" as UnitTypeLongPlural };
  const formMethods = useFormContext<FormValues>();

  useEffect(() => {
    if (!requiresConfirmation) {
      formMethods.setValue("metadata.requiresConfirmationThreshold", undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresConfirmation]);

  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );
  const requiresConfirmationLockedProps = shouldLockDisableProps("requiresConfirmation");

  const options = [
    { label: t("minute_timeUnit"), value: "minutes" },
    { label: t("hour_timeUnit"), value: "hours" },
  ];

  const defaultValue = options.find(
    (opt) =>
      opt.value === (metadata?.requiresConfirmationThreshold?.unit ?? defaultRequiresConfirmationSetup.unit)
  );

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="requiresConfirmation"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                requiresConfirmation && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              title={t("requires_confirmation")}
              disabled={seatsEnabled || requiresConfirmationLockedProps.disabled}
              tooltip={seatsEnabled ? t("seat_options_doesnt_support_confirmation") : undefined}
              description={t("requires_confirmation_description")}
              checked={requiresConfirmation}
              LockedIcon={requiresConfirmationLockedProps.LockedIcon}
              onCheckedChange={(val) => {
                formMethods.setValue("requiresConfirmation", val);
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
                      formMethods.setValue("requiresConfirmation", true);
                      onRequiresConfirmation(true);
                      formMethods.setValue("metadata.requiresConfirmationThreshold", undefined);
                      setRequiresConfirmationSetup(undefined);
                    } else if (val === "notice") {
                      formMethods.setValue("requiresConfirmation", true);
                      onRequiresConfirmation(true);
                      formMethods.setValue(
                        "metadata.requiresConfirmationThreshold",
                        requiresConfirmationSetup || defaultRequiresConfirmationSetup
                      );
                    }
                  }}>
                  <div className="flex flex-col flex-wrap justify-start gap-y-2">
                    {(requiresConfirmationSetup === undefined ||
                      !requiresConfirmationLockedProps.disabled) && (
                      <RadioField
                        label={t("always_requires_confirmation")}
                        disabled={requiresConfirmationLockedProps.disabled}
                        id="always"
                        value="always"
                      />
                    )}
                    {(requiresConfirmationSetup !== undefined ||
                      !requiresConfirmationLockedProps.disabled) && (
                      <RadioField
                        disabled={requiresConfirmationLockedProps.disabled}
                        className="items-center"
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
                                          val
                                        );
                                      }}
                                      className="border-default !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r"
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
                                            opt?.value as UnitTypeLongPlural
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
