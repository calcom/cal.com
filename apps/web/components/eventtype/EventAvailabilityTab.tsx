import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState, memo, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { OptionProps, SingleValueProps } from "react-select";
import { components } from "react-select";

import dayjs from "@calcom/dayjs";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { AvailabilityOption, FormValues } from "@calcom/features/eventtypes/lib/types";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { weekStartNum } from "@calcom/lib/weekstart";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Badge, Button, Icon, Select, SettingsToggle, SkeletonText } from "@calcom/ui";

import { SelectSkeletonLoader } from "@components/availability/SkeletonLoader";

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
  ({ isManagedEventType, scheduleId }: { isManagedEventType: boolean; scheduleId: number | null }) => {
    const { data: loggedInUser } = useMeQuery();
    const timeFormat = loggedInUser?.timeFormat;
    const { t, i18n } = useLocale();

    const { isPending, data: schedule } = trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId: scheduleId || loggedInUser?.defaultScheduleId || undefined,
        isManagedEventType,
      },
      { enabled: !!scheduleId || !!loggedInUser?.defaultScheduleId }
    );

    const weekStart = weekStartNum(loggedInUser?.weekStart);

    const filterDays = (dayNum: number) =>
      schedule?.schedule.filter((item) => item.days.includes((dayNum + weekStart) % 7)) || [];

    return (
      <div>
        <div className="border-subtle space-y-4 border-x p-6">
          <ol className="table border-collapse text-sm">
            {weekdayNames(i18n.language, weekStart, "long").map((day, index) => {
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
                  {isPending ? (
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
            <Icon name="globe" className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
            {schedule?.timeZone || <SkeletonText className="block h-5 w-32" />}
          </span>
          {!!schedule?.id && !schedule.isManaged && !schedule.readOnly && (
            <Button
              href={`/availability/${schedule.id}`}
              disabled={isPending}
              color="minimal"
              EndIcon="external-link"
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
  const formMethods = useFormContext<FormValues>();
  const { shouldLockIndicator, shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType } =
    useLockedFieldsManager({ eventType, translate: t, formMethods });
  const { watch, setValue } = formMethods;

  const { data, isPending } = trpc.viewer.availability.list.useQuery(undefined);

  const scheduleId = watch("schedule");

  useEffect(() => {
    // after data is loaded.
    if (data && scheduleId !== 0 && !scheduleId) {
      const newValue = isManagedEventType ? 0 : data.schedules.find((schedule) => schedule.isDefault)?.id;
      if (!newValue && newValue !== 0) return;
      setValue("schedule", newValue, {
        shouldDirty: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, data]);

  if (isPending || !data) {
    return <SelectSkeletonLoader />;
  }

  const schedules = data.schedules;

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
  if (isChildrenManagedEventType && scheduleId && !schedules.find((schedule) => schedule.id === scheduleId)) {
    options.push({
      value: scheduleId,
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

  return (
    <div>
      <div className="border-subtle rounded-t-md border p-6">
        <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
          {t("availability")}
          {(isManagedEventType || isChildrenManagedEventType) && shouldLockIndicator("schedule")}
        </label>
        <Controller
          name="schedule"
          render={({ field: { onChange, value } }) => {
            const optionValue: AvailabilityOption | undefined = options.find(
              (option) => option.value === value
            );
            return (
              <Select
                placeholder={t("select")}
                options={options}
                isDisabled={shouldLockDisableProps("schedule").disabled}
                isSearchable={false}
                onChange={(selected) => {
                  if (selected) onChange(selected.value);
                }}
                className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                value={optionValue}
                components={{ Option, SingleValue }}
                isMulti={false}
              />
            );
          }}
        />
      </div>
      {scheduleId !== 0 ? (
        <EventTypeScheduleDetails
          scheduleId={scheduleId}
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
  const { setValue, resetField, getFieldState, getValues } = useFormContext<FormValues>();

  const [useHostSchedulesForTeamEvent, setUseHostSchedulesForTeamEvent] = useState(
    Boolean(getFieldState("schedule").isDirty ? getValues("schedule") : eventType.schedule)
  );

  return (
    <SettingsToggle
      checked={useHostSchedulesForTeamEvent}
      onCheckedChange={(checked) => {
        setUseHostSchedulesForTeamEvent(checked);
        if (checked) {
          if (Boolean(eventType.schedule)) resetField("schedule");
        } else {
          setValue("schedule", null, { shouldDirty: Boolean(eventType.schedule) });
        }
      }}
      title={t("choose_common_schedule_team_event")}
      description={t("choose_common_schedule_team_event_description")}>
      <EventTypeSchedule eventType={eventType} />
    </SettingsToggle>
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
