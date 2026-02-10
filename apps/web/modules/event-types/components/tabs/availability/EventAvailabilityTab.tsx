import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useState, memo, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { OptionProps, SingleValueProps } from "react-select";
import { components } from "react-select";

import type { GetAllSchedulesByUserIdQueryType } from "./EventAvailabilityTabWebWrapper";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import dayjs from "@calcom/dayjs";
import { SelectSkeletonLoader } from "@calcom/features/availability/components/SkeletonLoader";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { TeamMembers } from "@calcom/web/modules/event-types/components/EventType";
import type {
  AvailabilityOption,
  FormValues,
  EventTypeSetup,
  Host,
  SelectClassNames,
} from "@calcom/features/eventtypes/lib/types";
import CheckboxField from "@calcom/features/form/components/CheckboxField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { weekStartNum } from "@calcom/lib/weekstart";
import { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Spinner } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export type ScheduleQueryData = RouterOutputs["viewer"]["availability"]["schedule"]["get"];

type AvailabilityTableCustomClassNames = {
  tableContainer?: string;
  table?: string;
  tableRow?: string;
  day?: string;
  dayUnavailable?: string;
  dayAvailabilityContainer?: string;
  dayAvailabilityFrom?: string;
  dayAvailabilityTo?: string;
  dayAvailabilitySeperator?: string;
};

type TeamMemmberScheduelCustomClassNames = SelectClassNames & {
  labelAvatar?: string;
  labelContainer?: string;
};

type UserAvailabilityCustomClassNames = {
  availabilitySectionContainer?: string;
  availabilitySelect?: SelectClassNames;
  availabilityTable?: AvailabilityTableCustomClassNames;
};

type TeamAvailabilityCustomClassNames = {
  chooseHostSchedulesLabelContainer?: string;
  chooseHostSchedulesLabel?: string;
  chooseHostSchedulesLabelDescription?: string;
  teamAvailibilityContainer?: string;
  teamMemberSchedule: TeamMemmberScheduelCustomClassNames;
};

export type EventAvailabilityTabCustomClassNames = {
  teamAvailability: TeamAvailabilityCustomClassNames;
  userAvailability: UserAvailabilityCustomClassNames;
};

type EventTypeScheduleDetailsProps = {
  scheduleQueryData?: Pick<ScheduleQueryData, "timeZone" | "id" | "isManaged" | "readOnly"> & {
    schedule: Array<Pick<ScheduleQueryData["schedule"][number], "days" | "startTime" | "endTime">>;
  };
  isSchedulePending?: boolean;
  user?: Pick<RouterOutputs["viewer"]["me"]["get"], "timeFormat" | "weekStart">;
  editAvailabilityRedirectUrl?: string;
  customClassNames?: AvailabilityTableCustomClassNames;
};

type HostSchedulesQueryType =
  | GetAllSchedulesByUserIdQueryType
  | (({ userId }: { userId: number }) => UseQueryResult<
      {
        schedules: {
          id: number;
          name: string;
          isDefault: boolean;
          userId: number;
          readOnly: boolean;
        }[];
      },
      Error
    >);

type EventTypeTeamScheduleProps = {
  hostSchedulesQuery: HostSchedulesQueryType;
  hosts?: Host[];
  customClassNames?: TeamAvailabilityCustomClassNames;
};

type TeamMember = Pick<TeamMembers[number], "avatar" | "name" | "id">;

type EventTypeScheduleProps = {
  schedulesQueryData?: Array<
    Omit<RouterOutputs["viewer"]["availability"]["list"]["schedules"][number], "availability">
  >;
  isSchedulesPending?: boolean;
  eventType: EventTypeSetup;
  teamMembers: TeamMember[];
  customClassNames?: UserAvailabilityCustomClassNames;
  fieldName?: "schedule" | "restrictionSchedule";
  scheduleQueryData?: ScheduleQueryData;
  restrictionScheduleQueryData?: ScheduleQueryData;
  isSchedulePending?: boolean;
  isRestrictionSchedulePending?: boolean;
  restrictionScheduleRedirectUrl?: string;
  isRestrictionScheduleEnabled?: boolean;
} & Omit<EventTypeScheduleDetailsProps, "customClassNames"> &
  Omit<EventTypeTeamScheduleProps, "customClassNames">;

export type EventAvailabilityTabBaserProps = {
  isTeamEvent: boolean;
};

type UseTeamEventScheduleSettingsToggle = Omit<EventTypeScheduleProps, "customClassNames"> & {
  customClassNames?: EventAvailabilityTabCustomClassNames;
};

type EventAvailabilityTabProps = EventAvailabilityTabBaserProps &
  Omit<EventTypeScheduleProps, "customClassNames"> & {
    customClassNames?: EventAvailabilityTabCustomClassNames;
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
    scheduleQueryData,
    isSchedulePending,
    user,
    editAvailabilityRedirectUrl,
    customClassNames,
  }: EventTypeScheduleDetailsProps) => {
    const timeFormat = user?.timeFormat;
    const { t, i18n } = useLocale();

    const weekStart = weekStartNum(user?.weekStart);

    const filterDays = (dayNum: number) =>
      scheduleQueryData?.schedule?.filter((item) => item.days.includes((dayNum + weekStart) % 7)) || [];

    return (
      <div>
        <div className={classNames("border-subtle stack-y-4 border-x p-6", customClassNames?.tableContainer)}>
          <ol className={classNames("table border-collapse text-sm", customClassNames?.table)}>
            {weekdayNames(i18n.language, weekStart, "long").map((day, index) => {
              const isAvailable = !!filterDays(index).length;
              return (
                <li
                  key={day}
                  className={classNames(
                    "my-6 flex border-transparent last:mb-2",
                    customClassNames?.tableRow
                  )}>
                  <span
                    className={classNames(
                      "w-20 font-medium sm:w-32 ",
                      !isAvailable ? "text-subtle line-through" : "text-default",
                      customClassNames?.day
                    )}>
                    {day}
                  </span>
                  {isSchedulePending ? (
                    <SkeletonText className="block h-5 w-60" />
                  ) : isAvailable ? (
                    <div className="stack-y-3 text-right">
                      {filterDays(index).map((dayRange, i) => (
                        <div
                          key={i}
                          className={classNames(
                            "text-default flex items-center leading-4",
                            customClassNames?.dayAvailabilityContainer
                          )}>
                          <span
                            className={classNames(
                              "w-16 sm:w-28 sm:text-left",
                              customClassNames?.dayAvailabilityFrom
                            )}>
                            {format(dayRange.startTime, timeFormat === 12)}
                          </span>
                          <span className={classNames("ms-4", customClassNames?.dayAvailabilitySeperator)}>
                            -
                          </span>
                          <div className={classNames("ml-6 sm:w-28", customClassNames?.dayAvailabilityTo)}>
                            {format(dayRange.endTime, timeFormat === 12)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={classNames("text-subtle ml-6 sm:ml-0", customClassNames?.dayUnavailable)}>
                      {t("unavailable")}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="bg-cal-muted border-subtle flex flex-col items-center gap-2 rounded-b-md border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-default flex items-center justify-center text-center text-sm sm:justify-start">
              <Icon name="globe" className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
              {scheduleQueryData?.timeZone || <SkeletonText className="block h-5 w-32" />}
            </span>
          </div>
          {!!scheduleQueryData?.id &&
            !scheduleQueryData.isManaged &&
            !scheduleQueryData.readOnly &&
            !!editAvailabilityRedirectUrl && (
              <Button
                href={editAvailabilityRedirectUrl}
                disabled={isSchedulePending}
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

type EventTypeRestrictionScheduleDetailsProps = {
  scheduleQueryData?: Pick<ScheduleQueryData, "timeZone" | "id" | "isManaged" | "readOnly"> & {
    schedule: Array<Pick<ScheduleQueryData["schedule"][number], "days" | "startTime" | "endTime">>;
  };
  isSchedulePending?: boolean;
  user?: Pick<RouterOutputs["viewer"]["me"]["get"], "timeFormat" | "weekStart">;
  restrictionScheduleRedirectUrl?: string;
  customClassNames?: AvailabilityTableCustomClassNames;
  useBookerTimezone?: boolean;
};

const EventTypeRestrictionScheduleDetails = memo(
  ({
    scheduleQueryData,
    isSchedulePending,
    user,
    restrictionScheduleRedirectUrl,
    customClassNames,
    useBookerTimezone: initialUseBookerTimezone,
  }: EventTypeRestrictionScheduleDetailsProps) => {
    const timeFormat = user?.timeFormat;
    const { t, i18n } = useLocale();
    const formMethods = useFormContext<FormValues>();
    const { setValue, watch } = formMethods;

    const weekStart = weekStartNum(user?.weekStart);

    const filterDays = (dayNum: number) =>
      scheduleQueryData?.schedule?.filter((item) => item.days.includes((dayNum + weekStart) % 7)) || [];

    const useBookerTimezone = watch("useBookerTimezone");

    useEffect(() => {
      if (useBookerTimezone === undefined) {
        setValue("useBookerTimezone", initialUseBookerTimezone || false, { shouldDirty: false });
      }
    }, [useBookerTimezone, setValue, initialUseBookerTimezone]);

    return (
      <div>
        <div className={classNames("border-subtle stack-y-4 border-x p-6", customClassNames?.tableContainer)}>
          <ol className={classNames("table border-collapse text-sm", customClassNames?.table)}>
            {weekdayNames(i18n.language, weekStart, "long").map((day, index) => {
              const isAvailable = !!filterDays(index).length;
              return (
                <li
                  key={day}
                  className={classNames(
                    "my-6 flex border-transparent last:mb-2",
                    customClassNames?.tableRow
                  )}>
                  <span
                    className={classNames(
                      "w-20 font-medium sm:w-32 ",
                      !isAvailable ? "text-subtle line-through" : "text-default",
                      customClassNames?.day
                    )}>
                    {day}
                  </span>
                  {isSchedulePending ? (
                    <SkeletonText className="block h-5 w-60" />
                  ) : isAvailable ? (
                    <div className="stack-y-3 text-right">
                      {filterDays(index).map((dayRange, i) => (
                        <div
                          key={i}
                          className={classNames(
                            "text-default flex items-center leading-4",
                            customClassNames?.dayAvailabilityContainer
                          )}>
                          <span
                            className={classNames(
                              "w-16 sm:w-28 sm:text-left",
                              customClassNames?.dayAvailabilityFrom
                            )}>
                            {format(dayRange.startTime, timeFormat === 12)}
                          </span>
                          <span className={classNames("ms-4", customClassNames?.dayAvailabilitySeperator)}>
                            -
                          </span>
                          <div className={classNames("ml-6 sm:w-28", customClassNames?.dayAvailabilityTo)}>
                            {format(dayRange.endTime, timeFormat === 12)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={classNames("text-subtle ml-6 sm:ml-0", customClassNames?.dayUnavailable)}>
                      {t("unavailable")}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="bg-cal-muted border-subtle flex flex-col justify-center gap-2 rounded-b-md border p-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2">
            <span
              className={classNames(
                "text-default flex items-center justify-center text-sm sm:justify-start",
                useBookerTimezone && "text-muted line-through"
              )}>
              <Icon
                name="globe"
                className={classNames("h-3.5 w-3.5 ltr:mr-2 rtl:ml-2", useBookerTimezone && "text-muted")}
              />
              {scheduleQueryData?.timeZone || <SkeletonText className="block h-5 w-32" />}
            </span>
            <div className="ltr:mr-2 rtl:ml-2">
              <CheckboxField
                checked={useBookerTimezone}
                disabled={isSchedulePending}
                description={t("use_booker_timezone")}
                informationIconText={t("use_booker_timezone_info")}
                onChange={(e) => {
                  setValue("useBookerTimezone", e.target.checked, { shouldDirty: true });
                }}
              />
            </div>
          </div>
          {!!scheduleQueryData?.id &&
            !scheduleQueryData.isManaged &&
            !scheduleQueryData.readOnly &&
            !!restrictionScheduleRedirectUrl && (
              <Button
                href={restrictionScheduleRedirectUrl}
                disabled={isSchedulePending}
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

EventTypeRestrictionScheduleDetails.displayName = "EventTypeRestrictionScheduleDetails";

const EventTypeSchedule = ({
  eventType,
  schedulesQueryData,
  isSchedulesPending,
  customClassNames,
  fieldName = "schedule",
  scheduleQueryData,
  restrictionScheduleQueryData,
  isSchedulePending,
  isRestrictionSchedulePending,
  restrictionScheduleRedirectUrl,
  ...rest
}: EventTypeScheduleProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { shouldLockIndicator, shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType } =
    useLockedFieldsManager({ eventType, translate: t, formMethods });
  const { watch, setValue } = formMethods;

  // Map the fieldName to the actual form field name
  const formFieldName = fieldName === "restrictionSchedule" ? "restrictionScheduleId" : fieldName;
  const scheduleId = watch(formFieldName);

  useEffect(() => {
    if (schedulesQueryData && scheduleId !== 0 && !scheduleId) {
      let newValue;
      if (fieldName === "restrictionSchedule") {
        newValue =
          eventType.restrictionScheduleId || schedulesQueryData.find((schedule) => schedule.isDefault)?.id;
      } else {
        newValue = isManagedEventType ? 0 : schedulesQueryData.find((schedule) => schedule.isDefault)?.id;
      }
      if (!newValue && newValue !== 0) return;
      setValue(formFieldName, newValue, {
        shouldDirty: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, schedulesQueryData]);

  if (isSchedulesPending || !schedulesQueryData) {
    return <SelectSkeletonLoader />;
  }

  if (schedulesQueryData.length === 0) {
    return (
      <EmptyScreen
        Icon="clock"
        headline={t("create_availability_schedule")}
        description={t("no_schedules_created_yet")}
        className="w-full"
        buttonRaw={
          <Button href="/availability" StartIcon="plus">
            {t("create")}
          </Button>
        }
      />
    );
  }

  const options = schedulesQueryData.map((schedule) => ({
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
    scheduleId &&
    !schedulesQueryData.find((schedule) => schedule.id === scheduleId)
  ) {
    options.push({
      value: scheduleId,
      label: eventType.scheduleName ?? t("default_schedule_name"),
      isDefault: false,
      isManaged: false,
    });
  }
  // We push the selected schedule from the event type if it's not part of the list response. This happens if the user is an admin but not the schedule owner.
  else if (eventType.schedule && !schedulesQueryData.find((schedule) => schedule.id === eventType.schedule)) {
    options.push({
      value: eventType.schedule,
      label: eventType.scheduleName ?? t("default_schedule_name"),
      isDefault: false,
      isManaged: false,
    });
  }

  if (
    fieldName === "restrictionSchedule" &&
    eventType.restrictionScheduleId &&
    !schedulesQueryData.find((schedule) => schedule.id === eventType.restrictionScheduleId)
  ) {
    options.push({
      value: eventType.restrictionScheduleId,
      label: eventType.restrictionScheduleName ?? t("default_schedule_name"),
      isDefault: false,
      isManaged: false,
    });
  }

  const filteredOptions =
    fieldName === "restrictionSchedule"
      ? options.filter((option) => option.value !== eventType.schedule)
      : options;

  const currentScheduleQueryData =
    fieldName === "schedule" ? scheduleQueryData : restrictionScheduleQueryData;
  const isCurrentSchedulePending =
    fieldName === "schedule" ? isSchedulePending : isRestrictionSchedulePending;

  return (
    <div>
      <div
        className={classNames(
          "border-subtle rounded-t-md border p-6",
          customClassNames?.availabilitySectionContainer
        )}>
        <label
          htmlFor="availability"
          className={classNames(
            "text-default mb-2 block text-sm font-medium leading-none",
            customClassNames?.availabilitySelect?.label
          )}>
          {t("availability")}
          {(isManagedEventType || isChildrenManagedEventType) && shouldLockIndicator(formFieldName)}
        </label>
        <Controller
          name={formFieldName}
          render={({ field: { onChange, value } }) => {
            const optionValue: AvailabilityOption | undefined = filteredOptions.find(
              (option) => option.value === value
            );
            return (
              <Select
                placeholder={t("select")}
                options={filteredOptions}
                isDisabled={shouldLockDisableProps(formFieldName).disabled}
                isSearchable={false}
                onChange={(selected) => {
                  if (selected) {
                    onChange(selected.value);
                    if (fieldName === "restrictionSchedule" && selected.value) {
                      setValue("restrictionScheduleId", selected.value, { shouldDirty: true });
                    }
                  }
                }}
                className={classNames(
                  "block w-full min-w-0 flex-1 rounded-sm text-sm",
                  customClassNames?.availabilitySelect?.select
                )}
                value={optionValue}
                components={{ Option, SingleValue }}
                isMulti={false}
                innerClassNames={customClassNames?.availabilitySelect?.innerClassNames}
              />
            );
          }}
        />
      </div>
      {scheduleId !== 0 && (fieldName === "schedule" || fieldName === "restrictionSchedule") ? (
        fieldName === "restrictionSchedule" ? (
          <EventTypeRestrictionScheduleDetails
            {...rest}
            scheduleQueryData={currentScheduleQueryData}
            isSchedulePending={isCurrentSchedulePending}
            customClassNames={customClassNames?.availabilityTable}
            useBookerTimezone={eventType.useBookerTimezone}
            restrictionScheduleRedirectUrl={restrictionScheduleRedirectUrl}
          />
        ) : (
          <EventTypeScheduleDetails
            {...rest}
            scheduleQueryData={currentScheduleQueryData}
            isSchedulePending={isCurrentSchedulePending}
            customClassNames={customClassNames?.availabilityTable}
          />
        )
      ) : (
        isManagedEventType &&
        fieldName === "schedule" && (
          <p className="mt-2! ml-1 text-sm text-gray-600">{t("members_default_schedule_description")}</p>
        )
      )}
    </div>
  );
};

const TeamMemberSchedule = ({
  host,
  index,
  teamMembers,
  hostScheduleQuery,
  customClassNames,
}: {
  host: Host;
  index: number;
  teamMembers: TeamMember[];
  hostScheduleQuery: HostSchedulesQueryType;
  customClassNames?: TeamMemmberScheduelCustomClassNames;
}) => {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();

  const formMethods = useFormContext<FormValues>();
  const { getValues } = formMethods;

  const { data, isPending } = hostScheduleQuery({
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
      <div className={classNames("flex w-full items-center", customClassNames?.labelContainer)}>
        {!isPlatform && <Avatar size="sm" imageSrc={avatar} alt={label || ""} />}
        {isPlatform && <Icon name="user" className={classNames("h-4 w-4", customClassNames?.labelAvatar)} />}
        <p className={classNames("text-emphasis my-auto ms-3 text-sm", customClassNames?.label)}>{label}</p>
      </div>
      <div className="flex w-full flex-col pt-2">
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
                  className={classNames(
                    "block w-full min-w-0 flex-1 rounded-sm text-sm",
                    customClassNames?.select
                  )}
                  innerClassNames={customClassNames?.innerClassNames}
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

const TeamAvailability = ({
  teamMembers,
  hostSchedulesQuery,
  customClassNames,
}: EventTypeTeamScheduleProps & {
  teamMembers: TeamMember[];
  customClassNames?: TeamAvailabilityCustomClassNames;
}) => {
  const { t } = useLocale();
  const { watch } = useFormContext<FormValues>();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  const hosts = watch("hosts");
  return (
    <>
      <div
        className={classNames(
          "border-subtle flex flex-col rounded-md",
          customClassNames?.teamAvailibilityContainer
        )}>
        <div
          className={classNames(
            "border-subtle mt-5 rounded-t-md border p-6 pb-5",
            customClassNames?.chooseHostSchedulesLabelContainer
          )}>
          <Label
            className={classNames("mb-1 text-sm font-semibold", customClassNames?.chooseHostSchedulesLabel)}>
            {t("choose_hosts_schedule")}
          </Label>
          <p
            className={classNames(
              "text-subtle max-w-full wrap-break-word text-sm leading-tight",
              customClassNames?.chooseHostSchedulesLabelDescription
            )}>
            {t("hosts_schedule_description")}
          </p>
        </div>
        <div className="border-subtle rounded-b-md border border-t-0 p-6">
          {hosts && hosts.length > 0 ? (
            <ul
              className={classNames("mb-4 mt-3 rounded-md", hosts.length >= 1 && "border-subtle border")}
              ref={animationRef}>
              {hosts?.map((host, index) => (
                <li
                  key={host.userId}
                  className={classNames(
                    `flex flex-col px-3 py-2 ${index === hosts.length - 1 ? "" : "border-subtle border-b"}`,
                    customClassNames?.teamMemberSchedule?.container
                  )}>
                  <TeamMemberSchedule
                    host={host}
                    index={index}
                    teamMembers={teamMembers}
                    hostScheduleQuery={hostSchedulesQuery}
                    customClassNames={customClassNames?.teamMemberSchedule}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-subtle max-w-full wrap-break-word text-sm leading-tight">
              {t("no_hosts_description")}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

const useCommonScheduleState = (initialScheduleId: number | null) => {
  const { setValue } = useFormContext<FormValues>();
  const [useHostSchedulesForTeamEvent, setUseHostSchedulesForTeamEvent] = useState(!initialScheduleId);
  // Reset the main schedule
  const clearMainSchedule = () => {
    setValue("schedule", null, { shouldDirty: Boolean(initialScheduleId) });
  };
  // Toggle function
  const toggleScheduleState = (checked: boolean) => {
    const useHostSchedulesForTeamEvent = !checked;
    setUseHostSchedulesForTeamEvent(useHostSchedulesForTeamEvent);
    if (useHostSchedulesForTeamEvent) clearMainSchedule();
  };
  return {
    useHostSchedulesForTeamEvent,
    toggleScheduleState,
  };
};

const useRestrictionScheduleState = (initialRestrictionScheduleId: number | null) => {
  const { setValue } = useFormContext<FormValues>();
  const [restrictScheduleForHosts, setRestrictScheduleForHosts] = useState(!!initialRestrictionScheduleId);

  // Toggle function for restriction schedule
  const toggleRestrictScheduleState = (checked: boolean) => {
    setRestrictScheduleForHosts(checked);
    if (!checked) {
      setValue("restrictionScheduleId", null, { shouldDirty: true });
      setValue("useBookerTimezone", false, { shouldDirty: true });
    }
  };

  return {
    restrictScheduleForHosts,
    toggleRestrictScheduleState,
  };
};

const UseTeamEventScheduleSettingsToggle = ({
  eventType,
  customClassNames,
  isRestrictionScheduleEnabled,
  ...rest
}: UseTeamEventScheduleSettingsToggle) => {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const { useHostSchedulesForTeamEvent, toggleScheduleState } = useCommonScheduleState(eventType.schedule);
  const { restrictScheduleForHosts, toggleRestrictScheduleState } = useRestrictionScheduleState(
    eventType.restrictionScheduleId
  );

  return (
    <div className="stack-y-4">
      <div className="border-subtle stack-y-6 rounded-lg border p-6">
        <SettingsToggle
          checked={!useHostSchedulesForTeamEvent}
          onCheckedChange={toggleScheduleState}
          title={t("choose_common_schedule_team_event")}
          description={t("choose_common_schedule_team_event_description")}>
          <EventTypeSchedule
            customClassNames={customClassNames?.userAvailability}
            eventType={eventType}
            fieldName="schedule"
            {...rest}
          />
        </SettingsToggle>
        {useHostSchedulesForTeamEvent && (
          <div className="lg:ml-14">
            <TeamAvailability
              teamMembers={rest.teamMembers}
              hostSchedulesQuery={rest.hostSchedulesQuery}
              customClassNames={customClassNames?.teamAvailability}
            />
          </div>
        )}
      </div>
      {!isPlatform && isRestrictionScheduleEnabled ? (
        <div className="border-subtle stack-y-6 rounded-lg border p-6">
          <SettingsToggle
            checked={restrictScheduleForHosts}
            onCheckedChange={toggleRestrictScheduleState}
            title={t("choose_restriction_schedule")}
            description={t("restriction_schedule_description")}>
            <EventTypeSchedule
              customClassNames={customClassNames?.userAvailability}
              eventType={eventType}
              fieldName="restrictionSchedule"
              {...rest}
            />
          </SettingsToggle>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export const EventAvailabilityTab = ({ eventType, isTeamEvent, ...rest }: EventAvailabilityTabProps) => {
  return isTeamEvent && eventType.schedulingType !== SchedulingType.MANAGED ? (
    <UseTeamEventScheduleSettingsToggle eventType={eventType} {...rest} />
  ) : (
    <EventTypeSchedule
      eventType={eventType}
      {...rest}
      customClassNames={rest?.customClassNames?.userAvailability}
    />
  );
};
