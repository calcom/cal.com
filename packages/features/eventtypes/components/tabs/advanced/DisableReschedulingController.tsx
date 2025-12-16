import * as RadioGroup from "@radix-ui/react-radio-group";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type { EventTypeSetup, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Input } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { RadioField } from "@calcom/ui/components/radio";

export type DisableReschedulingCustomClassNames = SettingsToggleClassNames & {
  radioGroupContainer?: string;
  alwaysRescheduleRadio?: string;
  conditionalRescheduleRadio?: {
    container?: string;
    timeInput?: string;
  };
};

type DisableReschedulingControllerProps = {
  eventType: EventTypeSetup;
  disableRescheduling: boolean;
  onDisableRescheduling: (val: boolean) => void;
  customClassNames?: DisableReschedulingCustomClassNames;
};

export default function DisableReschedulingController({
  eventType,
  disableRescheduling,
  onDisableRescheduling,
  customClassNames,
}: DisableReschedulingControllerProps) {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const currentMinimumRescheduleNotice = formMethods.watch("minimumRescheduleNotice");
  const [minimumRescheduleNoticeValue, setMinimumRescheduleNoticeValue] = useState<number>(
    currentMinimumRescheduleNotice && currentMinimumRescheduleNotice > 0 ? currentMinimumRescheduleNotice : 60
  );
  const radioGroupOnValueChangeRef = useRef<((val: string) => void) | null>(null);

  const shouldShowRadioButtons =
    disableRescheduling ||
    (currentMinimumRescheduleNotice !== null && currentMinimumRescheduleNotice > 0) ||
    eventType.disableRescheduling === true;

  useEffect(() => {
    if (currentMinimumRescheduleNotice && currentMinimumRescheduleNotice > 0) {
      setMinimumRescheduleNoticeValue(currentMinimumRescheduleNotice);
    }
  }, [currentMinimumRescheduleNotice]);

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });
  const disableReschedulingLocked = shouldLockDisableProps("disableRescheduling");
  const minimumRescheduleNoticeLocked = shouldLockDisableProps("minimumRescheduleNotice");

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="disabledRescheduling"
          control={formMethods.control}
          render={({ field: { onChange } }) => (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                shouldShowRadioButtons && "rounded-b-none",
                customClassNames?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.children)}
              descriptionClassName={customClassNames?.description}
              title={t("disable_rescheduling")}
              data-testid="disable-rescheduling-toggle"
              disabled={disableReschedulingLocked.disabled}
              LockedIcon={disableReschedulingLocked.LockedIcon}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="description_disable_rescheduling"
                  href="https://cal.com/help/event-types/disable-canceling-rescheduling#disable-rescheduling"
                />
              }
              checked={shouldShowRadioButtons}
              onCheckedChange={(val) => {
                if (val) {
                  onChange(true);
                  onDisableRescheduling(true);
                  formMethods.setValue("minimumRescheduleNotice", null, { shouldDirty: true });
                } else {
                  onChange(false);
                  onDisableRescheduling(false);
                  formMethods.setValue("minimumRescheduleNotice", null, { shouldDirty: true });
                }
              }}>
              {shouldShowRadioButtons && (
                <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                  <RadioGroup.Root
                    value={
                      disableRescheduling
                        ? "always"
                        : currentMinimumRescheduleNotice !== null && currentMinimumRescheduleNotice > 0
                        ? "notice"
                        : "always"
                    }
                    onValueChange={(val) => {
                      const handler = (val: string) => {
                        if (val === "always") {
                          onChange(true);
                          onDisableRescheduling(true);
                          formMethods.setValue("minimumRescheduleNotice", null, { shouldDirty: true });
                          setMinimumRescheduleNoticeValue(0);
                        } else if (val === "notice") {
                          onChange(false);
                          onDisableRescheduling(false);
                          const valueToSet =
                            minimumRescheduleNoticeValue > 0 ? minimumRescheduleNoticeValue : 60;
                          formMethods.setValue("minimumRescheduleNotice", valueToSet, { shouldDirty: true });
                          setMinimumRescheduleNoticeValue(valueToSet);
                        }
                      };
                      radioGroupOnValueChangeRef.current = handler;
                      handler(val);
                    }}>
                    <div
                      className={classNames(
                        "flex flex-col flex-wrap justify-start gap-y-2",
                        customClassNames?.radioGroupContainer
                      )}>
                      <RadioField
                        label={t("always")}
                        disabled={minimumRescheduleNoticeLocked.disabled}
                        id="always"
                        value="always"
                        className={customClassNames?.alwaysRescheduleRadio}
                      />
                      <RadioField
                        disabled={minimumRescheduleNoticeLocked.disabled}
                        className={classNames(
                          "items-center",
                          customClassNames?.conditionalRescheduleRadio?.container
                        )}
                        label={
                          <>
                            <ServerTrans
                              t={t}
                              i18nKey="when_less_than_minutes_before_meeting"
                              components={[
                                <div
                                  key="when_less_than_minutes_before_meeting"
                                  className="mx-2 inline-flex items-center">
                                  <Input
                                    type="number"
                                    min={1}
                                    disabled={minimumRescheduleNoticeLocked.disabled}
                                    onChange={(evt) => {
                                      const val = Number(evt.target?.value);
                                      if (val > 0) {
                                        setMinimumRescheduleNoticeValue(val);
                                        formMethods.setValue("minimumRescheduleNotice", val, {
                                          shouldDirty: true,
                                        });
                                        radioGroupOnValueChangeRef.current?.("notice");
                                      }
                                    }}
                                    className={classNames(
                                      "border-default m-0! block w-20 text-sm [appearance:textfield] focus:z-10",
                                      customClassNames?.conditionalRescheduleRadio?.timeInput
                                    )}
                                    defaultValue={
                                      currentMinimumRescheduleNotice && currentMinimumRescheduleNotice > 0
                                        ? currentMinimumRescheduleNotice
                                        : 60
                                    }
                                  />
                                </div>,
                              ]}
                            />
                          </>
                        }
                        id="notice"
                        value="notice"
                      />
                    </div>
                  </RadioGroup.Root>
                </div>
              )}
            </SettingsToggle>
          )}
        />
      </div>
    </div>
  );
}
