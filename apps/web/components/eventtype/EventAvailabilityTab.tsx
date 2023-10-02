import type { EventTypeSetup, FormValues } from "pages/event-types/[type]";
import { useState, memo, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { OptionProps, SingleValueProps } from "react-select";
import { components } from "react-select";

import dayjs from "@calcom/dayjs";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Badge, Button, Select, SettingsToggle, SkeletonText } from "@calcom/ui";
import { ExternalLink, Globe } from "@calcom/ui/components/icon";

import { SelectSkeletonLoader } from "@components/availability/SkeletonLoader";

export type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
  isManaged?: boolean;
};

const Option = ({ ...props }: OptionProps<AvailabilityOption>) => {
  const { label, isDefault, isManaged = false } = props.data;
  const { t } = useLocale();
  return (
    <components.Option {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          {t("default")}
        </Badge>
      )}
      {isManaged && (
        <Badge variant="gray" className="ml-2">
          {t("managed")}
        </Badge>
      )}
    </components.Option>
  );
};

const SingleValue = ({ ...props }: SingleValueProps<AvailabilityOption>) => {
  const { label, isDefault, isManaged = false } = props.data;
  const { t } = useLocale();
  return (
    <components.SingleValue {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          {t("default")}
        </Badge>
      )}
      {isManaged && (
        <Badge variant="gray" className="ml-2">
          {t("managed")}
        </Badge>
      )}
    </components.SingleValue>
  );
};

const format = (date: Date, hour12: boolean) =>
  Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    hourCycle: hour12 ? "h12" : "h24",
  }).format(new Date(dayjs.utc(date).format("YYYY-MM-DDTHH:mm:ss")));

const EventTypeScheduleDetails = memo(
  ({
    isManagedEventType,
    selectedScheduleValue,
  }: {
    isManagedEventType: boolean;
    selectedScheduleValue: AvailabilityOption | undefined;
  }) => {
    const { data: loggedInUser } = useMeQuery();
    const timeFormat = loggedInUser?.timeFormat;
    const { t, i18n } = useLocale();
    const { watch } = useFormContext<FormValues>();

    const scheduleId = watch("schedule");
    const { isLoading, data: schedule } = trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId:
          scheduleId || loggedInUser?.defaultScheduleId || selectedScheduleValue?.value || undefined,
        isManagedEventType,
      },
      { enabled: !!scheduleId || !!loggedInUser?.defaultScheduleId || !!selectedScheduleValue }
    );

    const filterDays = (dayNum: number) =>
      schedule?.schedule.filter((item) => item.days.includes((dayNum + 1) % 7)) || [];

    return (
      <div>
        <div className="border-subtle space-y-4 border-x p-6">
          <ol className="table border-collapse text-sm">
            {weekdayNames(i18n.language, 1, "long").map((day, index) => {
              const isAvailable = !!filterDays(index).length;
              return (
                <li key={day} className="my-6 flex border-transparent last:mb-2">
                  <span
                    className={classNames(
                      "w-20 font-medium sm:w-32 ",
                      !isAvailable ? "text-subtle line-through" : "text-default"
                    )}>
                    {day}
                  </span>
                  {isLoading ? (
                    <SkeletonText className="block h-5 w-60" />
                  ) : isAvailable ? (
                    <div className="space-y-3 text-right">
                      {filterDays(index).map((dayRange, i) => (
                        <div key={i} className="text-default flex items-center leading-4">
                          <span className="w-16 sm:w-28 sm:text-left">
                            {format(dayRange.startTime, timeFormat === 12)}
                          </span>
                          <span className="ms-4">-</span>
                          <div className="ml-6 sm:w-28">{format(dayRange.endTime, timeFormat === 12)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-subtle ml-6 sm:ml-0">{t("unavailable")}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="bg-muted border-subtle flex flex-col justify-center gap-2 rounded-b-md border p-6 sm:flex-row sm:justify-between">
          <span className="text-default flex items-center justify-center text-sm sm:justify-start">
            <Globe className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
            {schedule?.timeZone || <SkeletonText className="block h-5 w-32" />}
          </span>
          {!!schedule?.id && !schedule.isManaged && !schedule.readOnly && (
            <Button
              href={`/availability/${schedule.id}`}
              disabled={isLoading}
              color="minimal"
              EndIcon={ExternalLink}
              target="_blank"
              rel="noopener noreferrer">
              {t("edit_availability")}
            </Button>
          )}
        </div>
      </div>
    );
  }
);

EventTypeScheduleDetails.displayName = "EventTypeScheduleDetails";

const EventTypeSchedule = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();
  const { shouldLockIndicator, isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );
  const { watch, setValue, getValues } = useFormContext<FormValues>();
  const watchSchedule = watch("schedule");
  const [options, setOptions] = useState<AvailabilityOption[]>([]);

  const { isLoading } = trpc.viewer.availability.list.useQuery(undefined, {
    onSuccess: ({ schedules }) => {
      const options = schedules.map((schedule) => ({
        value: schedule.id,
        label: schedule.name,
        isDefault: schedule.isDefault,
        isManaged: false,
      }));

      // We are showing a managed event for a team admin, so adding the option to let members choose their schedule
      if (isManagedEventType) {
        options.push({
          value: 0,
          label: t("members_default_schedule"),
          isDefault: false,
          isManaged: false,
        });
      }

      // We are showing a managed event for a member and team owner selected their own schedule, so adding
      // the managed schedule option
      if (
        isChildrenManagedEventType &&
        watchSchedule &&
        !schedules.find((schedule) => schedule.id === watchSchedule)
      ) {
        options.push({
          value: watchSchedule,
          label: eventType.scheduleName ?? t("default_schedule_name"),
          isDefault: false,
          isManaged: false,
        });
      }
      // We push the selected schedule from the event type if it's not part of the list response. This happens if the user is an admin but not the schedule owner.
      else if (eventType.schedule && !schedules.find((schedule) => schedule.id === eventType.schedule)) {
        options.push({
          value: eventType.schedule,
          label: eventType.scheduleName ?? t("default_schedule_name"),
          isDefault: false,
          isManaged: false,
        });
      }

      setOptions(options);

      const scheduleId = getValues("schedule");
      const value = options.find((option) =>
        scheduleId
          ? option.value === scheduleId
          : isManagedEventType
          ? option.value === 0
          : option.value === schedules.find((schedule) => schedule.isDefault)?.id
      );

      setValue("availability", value);
    },
  });

  const availabilityValue = watch("availability");

  useEffect(() => {
    if (!availabilityValue?.value) return;
    setValue("schedule", availabilityValue.value);
  }, [availabilityValue, setValue]);

  return (
    <div>
      <div className="border-subtle rounded-t-md border p-6">
        <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
          {t("availability")}
          {shouldLockIndicator("availability")}
        </label>
        {isLoading && <SelectSkeletonLoader />}
        {!isLoading && (
          <Controller
            name="schedule"
            render={({ field }) => {
              return (
                <Select
                  placeholder={t("select")}
                  options={options}
                  isSearchable={false}
                  onChange={(selected) => {
                    field.onChange(selected?.value || null);
                    if (selected?.value) setValue("availability", selected);
                  }}
                  className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                  value={availabilityValue}
                  components={{ Option, SingleValue }}
                  isMulti={false}
                />
              );
            }}
          />
        )}
      </div>
      {availabilityValue?.value !== 0 ? (
        <EventTypeScheduleDetails
          selectedScheduleValue={availabilityValue}
          isManagedEventType={isManagedEventType || isChildrenManagedEventType}
        />
      ) : (
        isManagedEventType && (
          <p className="!mt-2 ml-1 text-sm text-gray-600">{t("members_default_schedule_description")}</p>
        )
      )}
    </div>
  );
};

const UseCommonScheduleSettingsToggle = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();
  const { setValue } = useFormContext<FormValues>();
  return (
    <Controller
      name="metadata.config.useHostSchedulesForTeamEvent"
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          checked={!value}
          onCheckedChange={(checked) => {
            onChange(!checked);
            if (!checked) {
              setValue("schedule", null);
            }
          }}
          title={t("choose_common_schedule_team_event")}
          description={t("choose_common_schedule_team_event_description")}>
          <EventTypeSchedule eventType={eventType} />
        </SettingsToggle>
      )}
    />
  );
};

export const EventAvailabilityTab = ({
  eventType,
  isTeamEvent,
}: {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
}) => {
  return isTeamEvent && eventType.schedulingType !== SchedulingType.MANAGED ? (
    <UseCommonScheduleSettingsToggle eventType={eventType} />
  ) : (
    <EventTypeSchedule eventType={eventType} />
  );
};
