import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext } from "react-hook-form";
import type { Options } from "react-select";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import type {
  FormValues,
  Host,
  InputClassNames,
  SelectClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { groupHostsByGroupId, getHostsFromOtherGroups, sortHosts } from "@calcom/lib/bookings/hostGroupUtils";
import { DEFAULT_GROUP_ID } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PeriodType } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { DateRangePicker, Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import WeightDescription from "@calcom/features/eventtypes/components/WeightDescription";

interface IDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  option: CheckedSelectOption;
  options: Options<CheckedSelectOption>;
  onChange: (value: readonly CheckedSelectOption[]) => void;
}

export type PriorityDialogCustomClassNames = SelectClassNames & {
  confirmButton?: string;
};

export const PriorityDialog = (
  props: IDialog & {
    customClassNames?: PriorityDialogCustomClassNames;
  }
) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, options, onChange, customClassNames } = props;
  const { getValues } = useFormContext<FormValues>();

  const priorityOptions = [
    { label: t("lowest"), value: 0 },
    { label: t("low"), value: 1 },
    { label: t("medium"), value: 2 },
    { label: t("high"), value: 3 },
    { label: t("highest"), value: 4 },
  ];

  const [newPriority, setNewPriority] = useState<{ label: string; value: number }>();
  const setPriority = () => {
    if (!!newPriority) {
      const hosts: Host[] = getValues("hosts");
      const isRRWeightsEnabled = getValues("isRRWeightsEnabled");
      const hostGroups = getValues("hostGroups");
      const rrHosts = hosts.filter((host) => !host.isFixed);

      const groupedHosts = groupHostsByGroupId({ hosts: rrHosts, hostGroups });

      let sortedHostGroup: CheckedSelectOption[] = [];

      const hostGroupToSort = groupedHosts[option.groupId ?? DEFAULT_GROUP_ID];

      if (hostGroupToSort) {
        sortedHostGroup = hostGroupToSort
          .map((host) => {
            return {
              ...option,
              value: host.userId.toString(),
              priority: host.userId === parseInt(option.value, 10) ? newPriority.value : host.priority,
              isFixed: false,
              weight: host.weight,
              groupId: host.groupId,
              userId: host.userId,
              overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
              overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
              overrideAfterEventBuffer: host.overrideAfterEventBuffer,
              overrideSlotInterval: host.overrideSlotInterval,
              overrideBookingLimits: host.overrideBookingLimits,
              overrideDurationLimits: host.overrideDurationLimits,
              overridePeriodType: host.overridePeriodType,
              overridePeriodStartDate: host.overridePeriodStartDate,
              overridePeriodEndDate: host.overridePeriodEndDate,
              overridePeriodDays: host.overridePeriodDays,
              overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
            };
          })
          .sort((a, b) => sortHosts(a, b, isRRWeightsEnabled));
      }

      const otherGroupsHosts = getHostsFromOtherGroups(rrHosts, option.groupId);

      const otherGroupsOptions = otherGroupsHosts.map((host) => {
        return {
          ...option,
          value: host.userId.toString(),
          priority: host.priority,
          weight: host.weight,
          isFixed: host.isFixed,
          groupId: host.groupId,
          userId: host.userId,
          overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
          overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
          overrideAfterEventBuffer: host.overrideAfterEventBuffer,
          overrideSlotInterval: host.overrideSlotInterval,
          overrideBookingLimits: host.overrideBookingLimits,
          overrideDurationLimits: host.overrideDurationLimits,
          overridePeriodType: host.overridePeriodType,
          overridePeriodStartDate: host.overridePeriodStartDate,
          overridePeriodEndDate: host.overridePeriodEndDate,
          overridePeriodDays: host.overridePeriodDays,
          overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
        };
      });
      const updatedHosts = [...otherGroupsOptions, ...sortedHostGroup];
      onChange(updatedHosts);
    }
    setIsOpenDialog(false);
  };
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_priority")}>
        <div className={classNames("mb-4", customClassNames?.container)}>
          <Label className={customClassNames?.label}>
            {t("priority_for_user", { userName: option.label })}
          </Label>
          <Select
            defaultValue={priorityOptions[option.priority ?? 2]}
            className={customClassNames?.select}
            innerClassNames={customClassNames?.innerClassNames}
            value={newPriority}
            onChange={(value) => setNewPriority(value ?? priorityOptions[2])}
            options={priorityOptions}
          />
        </div>

        <DialogFooter>
          <DialogClose onClick={() => setNewPriority(undefined)} />
          <Button onClick={setPriority} className={customClassNames?.confirmButton}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export type WeightDialogCustomClassNames = {
  container?: string;
  label?: string;
  confirmButton?: string;
  weightInput?: InputClassNames;
};
export const WeightDialog = (props: IDialog & { customClassNames?: WeightDialogCustomClassNames }) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, options, onChange, customClassNames } = props;
  const { getValues } = useFormContext<FormValues>();
  const [newWeight, setNewWeight] = useState<number | undefined>();

  const setWeight = () => {
    if (!!newWeight) {
      const hosts: Host[] = getValues("hosts");
      const isRRWeightsEnabled = getValues("isRRWeightsEnabled");
      const hostGroups = getValues("hostGroups");
      const rrHosts = hosts.filter((host) => !host.isFixed);

      const groupedHosts = groupHostsByGroupId({ hosts: rrHosts, hostGroups });

      const updateHostWeight = (host: Host) => {
        if (host.userId === parseInt(option.value, 10)) {
          return { ...host, weight: newWeight };
        }
        return host;
      };

      // Sort hosts within the group
      let sortedHostGroup: (Host & {
        avatar: string;
        label: string;
      })[] = [];

      const hostGroupToSort = groupedHosts[option.groupId ?? DEFAULT_GROUP_ID];

      if (hostGroupToSort) {
        sortedHostGroup = hostGroupToSort
          .map((host) => {
            const userOption = options.find((opt) => opt.value === host.userId.toString());
            const updatedHost = updateHostWeight(host);
            return {
              ...updatedHost,
              avatar: userOption?.avatar ?? "",
              label: userOption?.label ?? host.userId.toString(),
            };
          })
          .sort((a, b) => sortHosts(a, b, isRRWeightsEnabled));
      }

      const updatedOptions = sortedHostGroup.map((host) => ({
        avatar: host.avatar,
        label: host.label,
        value: host.userId.toString(),
        priority: host.priority,
        weight: host.weight,
        isFixed: host.isFixed,
        groupId: host.groupId,
        overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
        overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
        overrideAfterEventBuffer: host.overrideAfterEventBuffer,
        overrideSlotInterval: host.overrideSlotInterval,
        overrideBookingLimits: host.overrideBookingLimits,
        overrideDurationLimits: host.overrideDurationLimits,
        overridePeriodType: host.overridePeriodType,
        overridePeriodStartDate: host.overridePeriodStartDate,
        overridePeriodEndDate: host.overridePeriodEndDate,
        overridePeriodDays: host.overridePeriodDays,
        overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
      }));

      // Preserve hosts from other groups
      const otherGroupsHosts = getHostsFromOtherGroups(rrHosts, option.groupId);

      const otherGroupsOptions = otherGroupsHosts.map((host) => {
        const userOption = options.find((opt) => opt.value === host.userId.toString());
        return {
          avatar: userOption?.avatar ?? "",
          label: userOption?.label ?? host.userId.toString(),
          value: host.userId.toString(),
          priority: host.priority,
          weight: host.weight,
          isFixed: host.isFixed,
          groupId: host.groupId,
          overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
          overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
          overrideAfterEventBuffer: host.overrideAfterEventBuffer,
          overrideSlotInterval: host.overrideSlotInterval,
          overrideBookingLimits: host.overrideBookingLimits,
          overrideDurationLimits: host.overrideDurationLimits,
          overridePeriodType: host.overridePeriodType,
          overridePeriodStartDate: host.overridePeriodStartDate,
          overridePeriodEndDate: host.overridePeriodEndDate,
          overridePeriodDays: host.overridePeriodDays,
          overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
        };
      });
      const newFullValue = [...otherGroupsOptions, ...updatedOptions];
      onChange(newFullValue);
    }
    setIsOpenDialog(false);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_weight")} description={<WeightDescription t={t} />}>
        <div className={classNames("mb-4 mt-2", customClassNames?.container)}>
          <Label className={customClassNames?.label}>
            {t("weight_for_user", { userName: option.label })}
          </Label>
          <div className={classNames("w-36", customClassNames?.weightInput?.container)}>
            <TextField
              required
              min={0}
              className={customClassNames?.weightInput?.input}
              labelClassName={customClassNames?.weightInput?.label}
              addOnClassname={customClassNames?.weightInput?.addOn}
              label={t("Weight")}
              value={newWeight}
              defaultValue={option.weight ?? 100}
              type="number"
              onChange={(e) => setNewWeight(parseInt(e.target.value))}
              addOnSuffix={<>%</>}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose onClick={() => setNewWeight(undefined)} />
          <Button onClick={setWeight} className={customClassNames?.confirmButton}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export type LimitOverridesDialogCustomClassNames = {
  container?: string;
  label?: string;
  confirmButton?: string;
  clearButton?: string;
  input?: InputClassNames;
};

const toNullableInteger = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsed = Number.parseInt(trimmedValue, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const toUtcMidnight = (date: Date | undefined | null) => {
  if (!date) {
    return null;
  }

  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const buildLimitOverrideDefaults = (option: CheckedSelectOption): Partial<FormValues> => ({
  minimumBookingNotice: option.overrideMinimumBookingNotice ?? undefined,
  beforeEventBuffer: option.overrideBeforeEventBuffer ?? undefined,
  afterEventBuffer: option.overrideAfterEventBuffer ?? undefined,
  slotInterval: option.overrideSlotInterval ?? undefined,
  bookingLimits:
    option.overrideBookingLimits && Object.keys(option.overrideBookingLimits).length > 0
      ? option.overrideBookingLimits
      : undefined,
  durationLimits:
    option.overrideDurationLimits && Object.keys(option.overrideDurationLimits).length > 0
      ? option.overrideDurationLimits
      : undefined,
  periodType: option.overridePeriodType ?? undefined,
  periodDays: option.overridePeriodDays ?? undefined,
  periodCountCalendarDays: option.overridePeriodCountCalendarDays ?? undefined,
  periodDates:
    option.overridePeriodStartDate || option.overridePeriodEndDate
      ? {
          startDate:
            option.overridePeriodStartDate ?? option.overridePeriodEndDate ?? new Date(),
          endDate: option.overridePeriodEndDate ?? option.overridePeriodStartDate ?? new Date(),
        }
      : undefined,
});

export const LimitOverridesDialog = (
  props: IDialog & { customClassNames?: LimitOverridesDialogCustomClassNames }
) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, options, onChange, customClassNames } = props;
  const { getValues } = useFormContext<FormValues>();
  const limitForm = useForm<FormValues>({
    defaultValues: buildLimitOverrideDefaults(option),
  });
  const [minimumBookingNotice, setMinimumBookingNotice] = useState<string>("");
  const [beforeEventBuffer, setBeforeEventBuffer] = useState<string>("");
  const [afterEventBuffer, setAfterEventBuffer] = useState<string>("");
  const [slotInterval, setSlotInterval] = useState<string>("");

  useEffect(() => {
    setMinimumBookingNotice(option.overrideMinimumBookingNotice?.toString() ?? "");
    setBeforeEventBuffer(option.overrideBeforeEventBuffer?.toString() ?? "");
    setAfterEventBuffer(option.overrideAfterEventBuffer?.toString() ?? "");
    setSlotInterval(option.overrideSlotInterval?.toString() ?? "");
    limitForm.reset(buildLimitOverrideDefaults(option));
  }, [option, limitForm]);

  const applyOverrides = ({
    minimumBookingNoticeValue,
    beforeEventBufferValue,
    afterEventBufferValue,
    slotIntervalValue,
  }: {
    minimumBookingNoticeValue: number | null;
    beforeEventBufferValue: number | null;
    afterEventBufferValue: number | null;
    slotIntervalValue: number | null;
  }) => {
    const hosts: Host[] = getValues("hosts");
    const isRRWeightsEnabled = getValues("isRRWeightsEnabled");
    const hostGroups = getValues("hostGroups");
    const rrHosts = hosts.filter((host) => !host.isFixed);

    const groupedHosts = groupHostsByGroupId({ hosts: rrHosts, hostGroups });
    const hostGroupToSort = groupedHosts[option.groupId ?? DEFAULT_GROUP_ID];
    const bookingLimitsValue = limitForm.getValues("bookingLimits");
    const durationLimitsValue = limitForm.getValues("durationLimits");
    const periodTypeValue = limitForm.getValues("periodType");
    const periodDatesValue = limitForm.getValues("periodDates");
    const periodDaysValue = limitForm.getValues("periodDays");
    const periodCountCalendarDaysValue = limitForm.getValues("periodCountCalendarDays");

    const nextBookingLimits =
      bookingLimitsValue && Object.keys(bookingLimitsValue).length > 0 ? bookingLimitsValue : null;
    const nextDurationLimits =
      durationLimitsValue && Object.keys(durationLimitsValue).length > 0 ? durationLimitsValue : null;
    const nextPeriodType = periodTypeValue ?? null;
    const nextPeriodStartDate =
      nextPeriodType === PeriodType.RANGE ? toUtcMidnight(periodDatesValue?.startDate) : null;
    const nextPeriodEndDate =
      nextPeriodType === PeriodType.RANGE ? toUtcMidnight(periodDatesValue?.endDate) : null;
    const nextPeriodDays =
      nextPeriodType === PeriodType.ROLLING || nextPeriodType === PeriodType.ROLLING_WINDOW
        ? periodDaysValue ?? null
        : null;
    const nextPeriodCountCalendarDays =
      nextPeriodType === PeriodType.ROLLING || nextPeriodType === PeriodType.ROLLING_WINDOW
        ? periodCountCalendarDaysValue ?? null
        : null;

    const sortedHostGroup = (hostGroupToSort ?? [])
      .map((host) => {
        const userOption = options.find((opt) => opt.value === host.userId.toString());
        const updatedHost =
          host.userId === Number.parseInt(option.value, 10)
            ? {
                ...host,
                overrideMinimumBookingNotice: minimumBookingNoticeValue,
                overrideBeforeEventBuffer: beforeEventBufferValue,
                overrideAfterEventBuffer: afterEventBufferValue,
                overrideSlotInterval: slotIntervalValue,
                overrideBookingLimits: nextBookingLimits,
                overrideDurationLimits: nextDurationLimits,
                overridePeriodType: nextPeriodType,
                overridePeriodStartDate: nextPeriodStartDate,
                overridePeriodEndDate: nextPeriodEndDate,
                overridePeriodDays: nextPeriodDays,
                overridePeriodCountCalendarDays: nextPeriodCountCalendarDays,
              }
            : host;

        return {
          ...updatedHost,
          avatar: userOption?.avatar ?? "",
          label: userOption?.label ?? host.userId.toString(),
        };
      })
      .sort((a, b) => sortHosts(a, b, isRRWeightsEnabled));

    const updatedOptions = sortedHostGroup.map((host) => ({
      avatar: host.avatar,
      label: host.label,
      value: host.userId.toString(),
      priority: host.priority,
      weight: host.weight,
      isFixed: host.isFixed,
      groupId: host.groupId,
      overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
      overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
      overrideAfterEventBuffer: host.overrideAfterEventBuffer,
      overrideSlotInterval: host.overrideSlotInterval,
      overrideBookingLimits: host.overrideBookingLimits,
      overrideDurationLimits: host.overrideDurationLimits,
      overridePeriodType: host.overridePeriodType,
      overridePeriodStartDate: host.overridePeriodStartDate,
      overridePeriodEndDate: host.overridePeriodEndDate,
      overridePeriodDays: host.overridePeriodDays,
      overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
    }));

    const otherGroupsHosts = getHostsFromOtherGroups(rrHosts, option.groupId);
    const otherGroupsOptions = otherGroupsHosts.map((host) => {
      const userOption = options.find((opt) => opt.value === host.userId.toString());
      return {
        avatar: userOption?.avatar ?? "",
        label: userOption?.label ?? host.userId.toString(),
        value: host.userId.toString(),
        priority: host.priority,
        weight: host.weight,
        isFixed: host.isFixed,
        groupId: host.groupId,
        overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
        overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
        overrideAfterEventBuffer: host.overrideAfterEventBuffer,
        overrideSlotInterval: host.overrideSlotInterval,
        overrideBookingLimits: host.overrideBookingLimits,
        overrideDurationLimits: host.overrideDurationLimits,
        overridePeriodType: host.overridePeriodType,
        overridePeriodStartDate: host.overridePeriodStartDate,
        overridePeriodEndDate: host.overridePeriodEndDate,
        overridePeriodDays: host.overridePeriodDays,
        overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
      };
    });

    const fixedHostsOptions = hosts
      .filter((host) => host.isFixed)
      .map((host) => {
        const userOption = options.find((opt) => opt.value === host.userId.toString());

        return {
          avatar: userOption?.avatar ?? "",
          label: userOption?.label ?? host.userId.toString(),
          value: host.userId.toString(),
          priority: host.priority,
          weight: host.weight,
          isFixed: true,
          groupId: host.groupId,
          overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
          overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
          overrideAfterEventBuffer: host.overrideAfterEventBuffer,
          overrideSlotInterval: host.overrideSlotInterval,
          overrideBookingLimits: host.overrideBookingLimits,
          overrideDurationLimits: host.overrideDurationLimits,
          overridePeriodType: host.overridePeriodType,
          overridePeriodStartDate: host.overridePeriodStartDate,
          overridePeriodEndDate: host.overridePeriodEndDate,
          overridePeriodDays: host.overridePeriodDays,
          overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
        };
      });

    const nextHostsByUserId = new Map<string, (typeof updatedOptions)[number]>();
    [...fixedHostsOptions, ...otherGroupsOptions, ...updatedOptions].forEach((host) => {
      nextHostsByUserId.set(host.value, host);
    });

    onChange(Array.from(nextHostsByUserId.values()));
    setIsOpenDialog(false);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("event_limit_tab_title")}>
        <FormProvider {...limitForm}>
          <div className={classNames("mb-4 mt-2 grid grid-cols-2 gap-4", customClassNames?.container)}>
            <div>
              <Label className={customClassNames?.label}>{t("minimum_booking_notice")}</Label>
              <TextField
                type="number"
                min={0}
                className={customClassNames?.input?.input}
                labelClassName={customClassNames?.input?.label}
                addOnClassname={customClassNames?.input?.addOn}
                value={minimumBookingNotice}
                onChange={(e) => {
                  setMinimumBookingNotice(e.target.value);
                }}
              />
            </div>
            <div>
              <Label className={customClassNames?.label}>{t("slot_interval")}</Label>
              <TextField
                type="number"
                min={0}
                className={customClassNames?.input?.input}
                labelClassName={customClassNames?.input?.label}
                addOnClassname={customClassNames?.input?.addOn}
                value={slotInterval}
                onChange={(e) => {
                  setSlotInterval(e.target.value);
                }}
              />
            </div>
            <div>
              <Label className={customClassNames?.label}>
                {`${t("before_event")} ${t("buffer_time")}`}
              </Label>
              <TextField
                type="number"
                min={0}
                className={customClassNames?.input?.input}
                labelClassName={customClassNames?.input?.label}
                addOnClassname={customClassNames?.input?.addOn}
                value={beforeEventBuffer}
                onChange={(e) => {
                  setBeforeEventBuffer(e.target.value);
                }}
              />
            </div>
            <div>
              <Label className={customClassNames?.label}>
                {`${t("after_event")} ${t("buffer_time")}`}
              </Label>
              <TextField
                type="number"
                min={0}
                className={customClassNames?.input?.input}
                labelClassName={customClassNames?.input?.label}
                addOnClassname={customClassNames?.input?.addOn}
                value={afterEventBuffer}
                onChange={(e) => {
                  setAfterEventBuffer(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="border-subtle mt-4 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <Label className={customClassNames?.label}>{t("limit_booking_frequency")}</Label>
              <Button
                color="minimal"
                onClick={() => {
                  const bookingLimitsValue = limitForm.getValues("bookingLimits");
                  const hasBookingLimits =
                    bookingLimitsValue && Object.keys(bookingLimitsValue).length > 0;

                  limitForm.setValue("bookingLimits", hasBookingLimits ? undefined : { PER_DAY: 1 });
                }}>
                {limitForm.watch("bookingLimits") ? t("clear") : t("confirm")}
              </Button>
            </div>
            {limitForm.watch("bookingLimits") ? (
              <IntervalLimitsManager propertyName="bookingLimits" defaultLimit={1} step={1} />
            ) : null}
          </div>

          <div className="border-subtle mt-4 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <Label className={customClassNames?.label}>{t("limit_total_booking_duration")}</Label>
              <Button
                color="minimal"
                onClick={() => {
                  const durationLimitsValue = limitForm.getValues("durationLimits");
                  const hasDurationLimits =
                    durationLimitsValue && Object.keys(durationLimitsValue).length > 0;

                  limitForm.setValue("durationLimits", hasDurationLimits ? undefined : { PER_DAY: 60 });
                }}>
                {limitForm.watch("durationLimits") ? t("clear") : t("confirm")}
              </Button>
            </div>
            {limitForm.watch("durationLimits") ? (
              <IntervalLimitsManager
                propertyName="durationLimits"
                defaultLimit={60}
                step={15}
                textFieldSuffix={t("minutes")}
              />
            ) : null}
          </div>

          <div className="border-subtle mt-4 rounded-lg border p-4">
            <Label className={classNames("mb-3 block", customClassNames?.label)}>
              {t("limit_future_bookings")}
            </Label>
            <Controller
              name="periodType"
              control={limitForm.control}
              render={({ field: { onChange, value } }) => (
                <Select
                  isSearchable={false}
                  options={[
                    { label: t("unlimited"), value: PeriodType.UNLIMITED },
                    { label: t("rolling"), value: PeriodType.ROLLING },
                    { label: t("rolling_window"), value: PeriodType.ROLLING_WINDOW },
                    { label: t("within_date_range"), value: PeriodType.RANGE },
                  ]}
                  onChange={(selected) => onChange(selected?.value)}
                  value={
                    [
                      { label: t("unlimited"), value: PeriodType.UNLIMITED },
                      { label: t("rolling"), value: PeriodType.ROLLING },
                      { label: t("rolling_window"), value: PeriodType.ROLLING_WINDOW },
                      { label: t("within_date_range"), value: PeriodType.RANGE },
                    ].find((periodOption) => periodOption.value === (value ?? PeriodType.UNLIMITED)) ?? null
                  }
                />
              )}
            />

            {(limitForm.watch("periodType") === PeriodType.ROLLING ||
              limitForm.watch("periodType") === PeriodType.ROLLING_WINDOW) && (
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <Controller
                  name="periodDays"
                  control={limitForm.control}
                  render={({ field: { onChange, value } }) => (
                    <TextField
                      type="number"
                      min={1}
                      className={customClassNames?.input?.input}
                      labelClassName={customClassNames?.input?.label}
                      addOnClassname={customClassNames?.input?.addOn}
                      label={t("limit_future_bookings")}
                      value={value ?? ""}
                      onChange={(e) => onChange(toNullableInteger(e.target.value) ?? undefined)}
                    />
                  )}
                />
                <Controller
                  name="periodCountCalendarDays"
                  control={limitForm.control}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      isSearchable={false}
                      options={[
                        { label: t("business_days"), value: false },
                        { label: t("calendar_days"), value: true },
                      ]}
                      onChange={(selected) => onChange(selected?.value ?? true)}
                      value={
                        [
                          { label: t("business_days"), value: false },
                          { label: t("calendar_days"), value: true },
                        ].find((periodOption) => periodOption.value === value) ?? null
                      }
                    />
                  )}
                />
              </div>
            )}

            {limitForm.watch("periodType") === PeriodType.RANGE && (
              <div className="mt-4">
                <Controller
                  name="periodDates"
                  control={limitForm.control}
                  render={({ field: { onChange, value } }) => (
                    <DateRangePicker
                      dates={{
                        startDate: value?.startDate ?? new Date(),
                        endDate: value?.endDate ?? new Date(),
                      }}
                      onDatesChange={({ startDate, endDate }) => {
                        onChange({
                          startDate: toUtcMidnight(startDate) ?? new Date(),
                          endDate: toUtcMidnight(endDate) ?? new Date(),
                        });
                      }}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </FormProvider>
        <DialogFooter>
          <Button
            color="minimal"
            className={customClassNames?.clearButton}
            onClick={() => {
              limitForm.reset({
                bookingLimits: undefined,
                durationLimits: undefined,
                periodType: undefined,
                periodDays: undefined,
                periodCountCalendarDays: undefined,
                periodDates: undefined,
              });
              applyOverrides({
                minimumBookingNoticeValue: null,
                beforeEventBufferValue: null,
                afterEventBufferValue: null,
                slotIntervalValue: null,
              });
            }}>
            {t("clear")}
          </Button>
          <DialogClose
            onClick={() => {
              setMinimumBookingNotice("");
              setBeforeEventBuffer("");
              setAfterEventBuffer("");
              setSlotInterval("");
              limitForm.reset(buildLimitOverrideDefaults(option));
            }}
          />
          <Button
            onClick={() => {
              applyOverrides({
                minimumBookingNoticeValue: toNullableInteger(minimumBookingNotice),
                beforeEventBufferValue: toNullableInteger(beforeEventBuffer),
                afterEventBufferValue: toNullableInteger(afterEventBuffer),
                slotIntervalValue: toNullableInteger(slotInterval),
              });
            }}
            className={customClassNames?.confirmButton}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
