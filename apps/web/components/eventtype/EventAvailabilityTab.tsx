import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { EventTypeSetup, Host } from "pages/event-types/[type]";
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
import { Avatar, Badge, Button, Icon, Label, Select, SettingsToggle, SkeletonText } from "@calcom/ui";
import { Spinner } from "@calcom/ui/components/icon/Spinner";

import { SelectSkeletonLoader } from "@components/availability/SkeletonLoader";

import type { TeamMembers } from "~/event-types/views/event-types-single-view";

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
    const { isPending, data: schedule } = trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId:
          scheduleId || loggedInUser?.defaultScheduleId || selectedScheduleValue?.value || undefined,
        isManagedEventType,
      },
      { enabled: !!scheduleId || !!loggedInUser?.defaultScheduleId || !!selectedScheduleValue }
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
  const { watch, setValue, getValues } = formMethods;
  const watchSchedule = watch("schedule");
  const [options, setOptions] = useState<AvailabilityOption[]>([]);

  const { data, isPending } = trpc.viewer.availability.list.useQuery(undefined);

  useEffect(
    function refactorMeWithoutEffect() {
      if (!data) {
        return;
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

      setValue("availability", value, { shouldDirty: true });
    },
    [data]
  );
  const availabilityValue = watch("availability");

  useEffect(() => {
    if (!availabilityValue?.value) return;
    setValue("schedule", availabilityValue.value, { shouldDirty: true });
  }, [availabilityValue, setValue]);

  return (
    <div>
      <div className="border-subtle rounded-t-md border p-6">
        <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
          {t("availability")}
          {(isManagedEventType || isChildrenManagedEventType) && shouldLockIndicator("availability")}
        </label>
        {isPending && <SelectSkeletonLoader />}
        {!isPending && (
          <Controller
            name="schedule"
            render={({ field }) => {
              return (
                <Select
                  placeholder={t("select")}
                  options={options}
                  isDisabled={shouldLockDisableProps("availability").disabled}
                  isSearchable={false}
                  onChange={(selected) => {
                    field.onChange(selected?.value || null);
                    if (selected?.value) setValue("availability", selected, { shouldDirty: true });
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

const TeamMemberSchedule = ({
  host,
  index,
  teamMembers,
}: {
  host: Host;
  index: number;
  teamMembers: TeamMembers;
}) => {
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();
  const { setValue, getValues, getFieldState } = formMethods;

  const { data, isPending } = trpc.viewer.availability.schedule.getAllSchedulesByUserId.useQuery({
    userId: host.userId,
  });

  const schedules = data?.schedules;
  const options = schedules?.map((schedule) => ({
    value: schedule.id,
    label: schedule.name,
    isDefault: schedule.isDefault,
    isManaged: false,
  }));

  //Set to defaultSchedule if Host Schedule is not previously selected
  const scheduleId = getValues(`hosts.${index}.scheduleId`);
  const value = options?.find((option) =>
    scheduleId
      ? option.value === scheduleId
      : option.value === schedules?.find((schedule) => schedule.isDefault)?.id
  );

  const member = teamMembers.find((mem) => mem.id === host.userId);
  const avatar = member?.avatar;
  const label = member?.name;

  return (
    <>
      <div className="flex w-full items-center">
        <Avatar size="sm" imageSrc={avatar} alt={label || ""} />
        <p className="text-emphasis my-auto ms-3 text-sm">{label}</p>
      </div>
      <div className="flex w-full flex-col pt-2 ">
        {isPending ? (
          <Spinner className="mt-2 h-6 w-6" />
        ) : (
          <Controller
            name={`hosts.${index}.scheduleId`}
            render={({ field }) => {
              return (
                <Select
                  placeholder={t("select")}
                  options={options}
                  isSearchable={false}
                  onChange={(selected) => {
                    field.onChange(selected?.value || null);
                  }}
                  className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                  value={value as AvailabilityOption}
                  components={{ Option, SingleValue }}
                  isMulti={false}
                  isDisabled={isPending}
                />
              );
            }}
          />
        )}
      </div>
    </>
  );
};

export const TeamAvailability = ({
  hosts = [],
  teamMembers = [],
}: {
  hosts: Host[];
  teamMembers: TeamMembers;
}) => {
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <div className="border-subtle flex flex-col rounded-md">
        <div className="border-subtle mt-5 rounded-t-md border p-6 pb-5">
          <Label className="mb-1 text-sm font-semibold">{t("choose_hosts_schedule")}</Label>
          <p className="text-subtle max-w-full break-words text-sm leading-tight">
            {t("hosts_schedule_description")}
          </p>
        </div>
        <div className="border-subtle rounded-b-md border border-t-0 p-6">
          {hosts.length > 0 ? (
            <ul
              className={classNames("mb-4 mt-3 rounded-md", hosts.length >= 1 && "border-subtle border")}
              ref={animationRef}>
              {hosts.map((host, index) => (
                <li
                  key={host.userId}
                  className={`flex flex-col px-3 py-2 ${
                    index === hosts.length - 1 ? "" : "border-subtle border-b"
                  }`}>
                  <TeamMemberSchedule host={host} index={index} teamMembers={teamMembers} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-subtle max-w-full break-words text-sm leading-tight">
              {t("no_hosts_description")}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

const UseCommonScheduleSettingsToggle = ({
  eventType,
  teamMembers,
}: {
  eventType: EventTypeSetup;
  teamMembers: TeamMembers;
}) => {
  const { t } = useLocale();
  const { setValue, getValues, watch } = useFormContext<FormValues>();

  const watchScheduleConfig = watch("metadata.config.useHostSchedulesForTeamEvent");
  const watchHosts = watch("hosts");

  return (
    <Controller
      name="metadata.config.useHostSchedulesForTeamEvent"
      render={({ field: { value, onChange } }) => (
        <>
          <SettingsToggle
            checked={!value}
            onCheckedChange={(checked) => {
              onChange(!checked);
              if (!checked) {
                setValue("schedule", null, { shouldDirty: true });
              } else {
                getValues("hosts").map((_, index) => {
                  setValue(`hosts.${index}.scheduleId`, null, { shouldDirty: true });
                });
              }
            }}
            title={t("choose_common_schedule_team_event")}
            description={t("choose_common_schedule_team_event_description")}>
            <EventTypeSchedule eventType={eventType} />
          </SettingsToggle>
          {watchScheduleConfig && <TeamAvailability hosts={watchHosts} teamMembers={teamMembers} />}
        </>
      )}
    />
  );
};

export const EventAvailabilityTab = ({
  eventType,
  isTeamEvent,
  teamMembers,
}: {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
  teamMembers: TeamMembers;
}) => {
  return isTeamEvent && eventType.schedulingType !== SchedulingType.MANAGED ? (
    <UseCommonScheduleSettingsToggle eventType={eventType} teamMembers={teamMembers} />
  ) : (
    <EventTypeSchedule eventType={eventType} />
  );
};
