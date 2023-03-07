import * as RadioGroup from "@radix-ui/react-radio-group";
import type { UnitTypeLongPlural } from "dayjs";
import { Trans } from "next-i18next";
import type { FormValues } from "pages/event-types/[type]";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Alert, Input, Label, SettingsToggle } from "@calcom/ui";

type RequiresConfirmationControllerProps = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  requiresConfirmation: boolean;
  onRequiresConfirmation: Dispatch<SetStateAction<boolean>>;
  seatsEnabled: boolean;
};

export default function RequiresConfirmationController({
  metadata,
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
  }, [requiresConfirmation]);

  return (
    <div className="block items-start sm:flex">
      <div className={!seatsEnabled ? "w-full" : ""}>
        {seatsEnabled ? (
          <Alert severity="warning" title="Seats option doesn't support confirmation requirement" />
        ) : (
          <Controller
            name="requiresConfirmation"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("requires_confirmation")}
                description={t("requires_confirmation_description")}
                checked={requiresConfirmation}
                onCheckedChange={(val) => {
                  formMethods.setValue("requiresConfirmation", val);
                  onRequiresConfirmation(val);
                }}>
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
                  <div className="-ml-2 flex flex-col flex-wrap justify-start gap-y-2 space-y-2">
                    <div className="flex items-center">
                      <RadioGroup.Item
                        id="always"
                        value="always"
                        className="min-w-4 flex h-4 w-4 cursor-pointer items-center rounded-full border border-black bg-white focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                        <RadioGroup.Indicator className="relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                      </RadioGroup.Item>
                      <Label htmlFor="always" className="!m-0 flex items-center">
                        {t("always_requires_confirmation")}
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroup.Item
                        id="notice"
                        value="notice"
                        className="min-w-4 flex h-4 w-4 cursor-pointer items-center rounded-full border border-black bg-white focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                        <RadioGroup.Indicator className="relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                      </RadioGroup.Item>
                      <Label htmlFor="notice" className="!m-0 flex items-center">
                        <Trans
                          i18nKey="when_booked_with_less_than_notice"
                          defaults="When booked with less than <time></time> notice"
                          components={{
                            time: (
                              <div className="mx-2 flex">
                                <Input
                                  type="number"
                                  min={1}
                                  onChange={(evt) => {
                                    const val = Number(evt.target?.value);
                                    setRequiresConfirmationSetup({
                                      unit:
                                        requiresConfirmationSetup?.unit ??
                                        defaultRequiresConfirmationSetup.unit,
                                      time: val,
                                    });
                                    formMethods.setValue("metadata.requiresConfirmationThreshold.time", val);
                                  }}
                                  className="!m-0 block w-16 rounded-md border-gray-300 text-sm [appearance:textfield]"
                                  defaultValue={metadata?.requiresConfirmationThreshold?.time || 30}
                                />
                                <select
                                  onChange={(evt) => {
                                    const val = evt.target.value as UnitTypeLongPlural;
                                    setRequiresConfirmationSetup({
                                      time:
                                        requiresConfirmationSetup?.time ??
                                        defaultRequiresConfirmationSetup.time,
                                      unit: val,
                                    });
                                    formMethods.setValue("metadata.requiresConfirmationThreshold.unit", val);
                                  }}
                                  className="ml-2 block h-9 rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:outline-none"
                                  defaultValue={
                                    metadata?.requiresConfirmationThreshold?.unit ||
                                    defaultRequiresConfirmationSetup.unit
                                  }>
                                  <option value="minutes">{t("minute_timeUnit")}</option>
                                  <option value="hours">{t("hour_timeUnit")}</option>
                                </select>
                              </div>
                            ),
                          }}
                        />
                      </Label>
                    </div>
                  </div>
                </RadioGroup.Root>
              </SettingsToggle>
            )}
          />
        )}
      </div>
    </div>
  );
}
