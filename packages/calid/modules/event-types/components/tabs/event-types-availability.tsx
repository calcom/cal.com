import { Button } from "@calid/features/ui/components/button";
import { Card, CardContent } from "@calid/features/ui/components/card";
import { CustomSelect } from "@calid/features/ui/components/custom-select";
import { Icon } from "@calid/features/ui/components/icon";
import { Label } from "@calid/features/ui/components/label";
import { Separator } from "@calid/features/ui/components/separator";
import { Skeleton } from "@calid/features/ui/components/skeleton";
import { SettingsSwitch } from "@calid/features/ui/components/switch";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useFormContext, Controller } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import dayjs from "@calcom/dayjs";
import { SelectSkeletonLoader } from "@calcom/features/availability/components/SkeletonLoader";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { TeamMembers } from "@calcom/features/eventtypes/components/EventType";
import type {
  EventTypeSetup,
  FormValues,
  Host,
  AvailabilityOption,
} from "@calcom/features/eventtypes/lib/types";
import CheckboxField from "@calcom/features/form/components/CheckboxField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { weekStartNum } from "@calcom/lib/weekstart";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";

export type GetAllSchedulesByUserIdQueryType =
  | typeof trpc.viewer.availability.schedule.calid_getAllSchedulesByUserId.useQuery
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

type ScheduleQueryData = RouterOutputs["viewer"]["availability"]["schedule"]["get"];
type TeamMember = Pick<TeamMembers[number], "avatar" | "name" | "id">;

export interface EventAvailabilityProps {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
  user?: RouterOutputs["viewer"]["me"]["calid_get"];
  teamMembers: TeamMembers;
  hostSchedulesQuery?: GetAllSchedulesByUserIdQueryType;
}

interface ScheduleDay {
  day: string;
  available: boolean;
  schedules: { startTime: string; endTime: string }[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats time according to user preferences (12/24 hour format)
 */
const formatTime = (date: Date, hour12: boolean): string =>
  Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    hourCycle: hour12 ? "h12" : "h24",
  }).format(new Date(dayjs.utc(date).format("YYYY-MM-DDTHH:mm:ss")));

/**
 * Creates weekly schedule structure with availability and time slots
 */
const createWeeklySchedule = (
  scheduleData: ScheduleQueryData,
  timeFormat: number | undefined,
  i18nLanguage: string,
  weekStart: number
): ScheduleDay[] => {
  const filterDays = (dayNum: number) =>
    scheduleData?.schedule?.filter((item) => item.days.includes((dayNum + weekStart) % 7)) || [];

  return weekdayNames(i18nLanguage, weekStart, "long").map((day, index) => {
    const daySchedules = filterDays(index);
    const isAvailable = daySchedules.length > 0;

    return {
      day,
      available: isAvailable,
      schedules: daySchedules.map((dayRange) => ({
        startTime: formatTime(dayRange.startTime, timeFormat === 12),
        endTime: formatTime(dayRange.endTime, timeFormat === 12),
      })),
    };
  });
};

/**
 * Creates schedule options from schedules data with proper labeling
 */
const createScheduleOptions = (
  schedulesData: any,
  isManagedEventType: boolean,
  isChildrenManagedEventType: boolean,
  scheduleId: number | null,
  eventType: EventTypeSetup,
  t: TFunction
): AvailabilityOption[] => {
  if (!schedulesData?.schedules) return [];

  const options: AvailabilityOption[] = schedulesData.schedules.map((schedule: any) => ({
    value: schedule.id,
    label: schedule.name,
    isDefault: schedule.isDefault,
    isManaged: false,
  }));

  // Add managed event type default option
  if (isManagedEventType) {
    options.push({
      value: 0,
      label: t("members_default_schedule"),
      isDefault: false,
      isManaged: false,
    });
  }

  // Add current event type schedule if missing
  if (
    isChildrenManagedEventType &&
    scheduleId &&
    !schedulesData.schedules.find((schedule: any) => schedule.id === scheduleId)
  ) {
    options.push({
      value: scheduleId,
      label: eventType.scheduleName ?? t("default_schedule_name"),
      isDefault: false,
      isManaged: true,
    });
  } else if (
    eventType.schedule &&
    !schedulesData.schedules.find((schedule: any) => schedule.id === eventType.schedule)
  ) {
    options.push({
      value: eventType.schedule,
      label: eventType.scheduleName ?? t("default_schedule_name"),
      isDefault: false,
      isManaged: false,
    });
  }

  return options;
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Manages common schedule state for team events (host schedules vs common schedule)
 */
const useCommonScheduleState = (initialScheduleId: number | null) => {
  const { setValue } = useFormContext<FormValues>();
  const [useHostSchedulesForTeamEvent, setUseHostSchedulesForTeamEvent] = useState(!initialScheduleId);

  const clearMainSchedule = useCallback(() => {
    setValue("schedule", null, { shouldDirty: Boolean(initialScheduleId) });
  }, [setValue, initialScheduleId]);

  const toggleScheduleState = useCallback(
    (checked: boolean) => {
      const useHostSchedules = !checked;
      setUseHostSchedulesForTeamEvent(useHostSchedules);
      if (useHostSchedules) clearMainSchedule();
    },
    [clearMainSchedule]
  );

  return { useHostSchedulesForTeamEvent, toggleScheduleState };
};

/**
 * Manages restriction schedule state and related form fields
 */
const useRestrictionScheduleState = (initialRestrictionScheduleId: number | null) => {
  const { setValue } = useFormContext<FormValues>();
  const [restrictScheduleForHosts, setRestrictScheduleForHosts] = useState(!!initialRestrictionScheduleId);

  const toggleRestrictScheduleState = useCallback(
    (checked: boolean) => {
      setRestrictScheduleForHosts(checked);
      if (!checked) {
        setValue("restrictionScheduleId", null, { shouldDirty: true });
        setValue("useBookerTimezone", false, { shouldDirty: true });
      }
    },
    [setValue]
  );

  return { restrictScheduleForHosts, toggleRestrictScheduleState };
};

/**
 * Manages default schedule initialization and updates
 */
const useScheduleDefaults = (
  schedulesData: any,
  scheduleId: number | null,
  restrictionScheduleId: number | null,
  isManagedEventType: boolean,
  eventType: EventTypeSetup,
  formMethods: any
) => {
  // Set default main schedule
  useEffect(() => {
    if (schedulesData?.schedules && scheduleId !== 0 && !scheduleId) {
      let newValue;
      if (isManagedEventType) {
        newValue = 0;
      } else {
        newValue =
          eventType.schedule || schedulesData.schedules.find((schedule: any) => schedule.isDefault)?.id;
      }

      if (newValue !== undefined) {
        formMethods.setValue("schedule", newValue, { shouldDirty: true });
      }
    }
  }, [scheduleId, schedulesData?.schedules, isManagedEventType, eventType.schedule, formMethods]);

  // Set default restriction schedule
  useEffect(() => {
    if (schedulesData?.schedules && !restrictionScheduleId && eventType.restrictionScheduleId) {
      formMethods.setValue("restrictionScheduleId", eventType.restrictionScheduleId, { shouldDirty: false });
    }
  }, [restrictionScheduleId, schedulesData?.schedules, eventType.restrictionScheduleId, formMethods]);
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual team member schedule selector component
 */
const TeamMemberSchedule = memo(
  ({
    host,
    index,
    teamMembers,
    hostScheduleQuery,
  }: {
    host: Host;
    index: number;
    teamMembers: TeamMember[];
    hostScheduleQuery: GetAllSchedulesByUserIdQueryType;
  }) => {
    const { t } = useLocale();
    const isPlatform = useIsPlatform();
    const { getValues } = useFormContext<FormValues>();

    const { data, isPending } = hostScheduleQuery({ userId: host.userId });
    const member = useMemo(
      () => teamMembers.find((mem) => mem.id === host.userId),
      [teamMembers, host.userId]
    );

    // Transform schedule data to options format
    const options = useMemo(
      () =>
        data?.schedules?.map((schedule) => ({
          value: schedule.id.toString(),
          label: schedule.name,
        })) || [],
      [data?.schedules]
    );

    // Get current schedule value
    const scheduleId = getValues(`hosts.${index}.scheduleId`);
    const value = useMemo(
      () =>
        options?.find((option) =>
          scheduleId
            ? option.value === scheduleId.toString()
            : option.value === data?.schedules?.find((schedule) => schedule.isDefault)?.id?.toString()
        ),
      [options, scheduleId, data?.schedules]
    );

    if (isPending) {
      return <Icon name="loader-circle" className="mt-2 h-6 w-6 animate-spin" />;
    }

    return (
      <div className="flex items-center justify-between space-x-4">
        {/* Member Info */}
        <div className="flex items-center space-x-3">
          {!isPlatform && member?.avatar ? (
            <img src={member.avatar} alt={member.name || ""} className="h-6 w-6 rounded-full" />
          ) : (
            <Icon name="user" className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{member?.name}</span>
        </div>

        {/* Schedule Selector */}
        <div className="min-w-[200px]">
          <Controller
            name={`hosts.${index}.scheduleId`}
            render={({ field }) => (
              <CustomSelect
                value={field.value?.toString() || value?.value?.toString() || ""}
                onValueChange={(selectedValue) => {
                  field.onChange(selectedValue ? parseInt(selectedValue) : null);
                }}
                options={options}
                placeholder={t("select")}
                disabled={isPending}
              />
            )}
          />
        </div>
      </div>
    );
  }
);

TeamMemberSchedule.displayName = "TeamMemberSchedule";

/**
 * Schedule display component showing weekly availability and timezone info
 */
const ScheduleDisplay = memo(
  ({
    scheduleQueryData,
    isSchedulePending,
    user,
    editAvailabilityRedirectUrl,
    isRestrictionSchedule = false,
    useBookerTimezone,
  }: {
    scheduleQueryData?: ScheduleQueryData;
    isSchedulePending?: boolean;
    user?: RouterOutputs["viewer"]["me"]["calid_get"];
    editAvailabilityRedirectUrl?: string;
    isRestrictionSchedule?: boolean;
    useBookerTimezone?: boolean;
  }) => {
    const { t, i18n } = useLocale();
    const { setValue, watch } = useFormContext<FormValues>();

    const timeFormat = user?.timeFormat;
    const weekStart = weekStartNum(user?.weekStart);
    const currentUseBookerTimezone = watch("useBookerTimezone");

    // Initialize booker timezone setting for restriction schedules
    useEffect(() => {
      if (isRestrictionSchedule && currentUseBookerTimezone === undefined) {
        setValue("useBookerTimezone", useBookerTimezone || false, { shouldDirty: false });
      }
    }, [isRestrictionSchedule, currentUseBookerTimezone, setValue, useBookerTimezone]);

    // Create weekly schedule structure
    const weeklySchedule = useMemo(() => {
      if (!scheduleQueryData) return [];
      return createWeeklySchedule(scheduleQueryData, timeFormat ?? undefined, i18n.language, weekStart);
    }, [scheduleQueryData, timeFormat, i18n.language, weekStart]);

    const handleEditAvailability = useCallback(() => {
      if (editAvailabilityRedirectUrl) {
        window.open(editAvailabilityRedirectUrl, "_blank", "noopener,noreferrer");
      }
    }, [editAvailabilityRedirectUrl]);

    if (isSchedulePending) {
      return <Skeleton className="h-5 w-60" />;
    }

    return (
      <div className="space-y-6">
        {/* Weekly Schedule Grid */}
        <div className="border-subtle space-y-4 border-b pb-4">
          <ol className="table w-full border-collapse text-sm">
            {weeklySchedule.map((schedule) => (
              <li key={schedule.day} className="my-6 flex justify-between border-transparent last:mb-2">
                <span
                  className={`w-20 font-medium sm:w-32 ${
                    !schedule.available ? "text-subtle line-through" : "text-default"
                  }`}>
                  {schedule.day}
                </span>
                {schedule.available ? (
                  <div className="space-y-3 text-right">
                    {schedule.schedules.map((timeSlot, i) => (
                      <div key={i} className="text-default flex items-center leading-4">
                        <span className="w-16 sm:w-28 sm:text-left">{timeSlot.startTime}</span>
                        <span className="ms-4">-</span>
                        <div className="ml-6 sm:w-28">{timeSlot.endTime}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-subtle ml-6 sm:ml-0">{t("unavailable")}</span>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Footer with Timezone and Edit Button */}
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            {/* Timezone Display */}
            <span
              className={`text-default flex items-center justify-center text-center text-sm sm:justify-start ${
                isRestrictionSchedule && currentUseBookerTimezone ? "text-muted line-through" : ""
              }`}>
              <Icon
                name="globe"
                className={`h-3.5 w-3.5 ltr:mr-2 rtl:ml-2 ${
                  isRestrictionSchedule && currentUseBookerTimezone ? "text-muted" : ""
                }`}
              />
              {scheduleQueryData?.timeZone || <Skeleton className="h-5 w-32" />}
            </span>

            {/* Booker Timezone Checkbox for Restriction Schedules */}
            {isRestrictionSchedule && (
              <div className="ltr:mr-2 rtl:ml-2">
                <CheckboxField
                  checked={currentUseBookerTimezone}
                  disabled={isSchedulePending}
                  description={t("use_booker_timezone")}
                  informationIconText={t("use_booker_timezone_info")}
                  onChange={(e) => {
                    setValue("useBookerTimezone", e.target.checked, { shouldDirty: true });
                  }}
                />
              </div>
            )}
          </div>

          {/* Edit Availability Button */}
          {!!scheduleQueryData?.id &&
            !scheduleQueryData.isManaged &&
            !scheduleQueryData.readOnly &&
            !!editAvailabilityRedirectUrl && (
              <Button
                onClick={handleEditAvailability}
                disabled={isSchedulePending}
                color="secondary"
                StartIcon="external-link">
                {t("edit_availability")}
              </Button>
            )}
        </div>
      </div>
    );
  }
);

ScheduleDisplay.displayName = "ScheduleDisplay";

/**
 * Schedule selector dropdown component with proper labeling and badges
 */
const ScheduleSelector = memo(
  ({
    fieldName,
    options,
    shouldLockDisableProps,
    shouldLockIndicator,
    isManagedEventType,
  }: {
    fieldName: string;
    options: AvailabilityOption[];
    shouldLockDisableProps: (field: string) => { disabled: boolean };
    shouldLockIndicator: (field: string) => React.ReactNode;
    isManagedEventType: boolean;
  }) => {
    const { t } = useLocale();
    const formMethods = useFormContext<FormValues>();

    return (
      <div className="border-subtle border-b pb-4">
        <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
          {/* Label intentionally commented out as per original code */}
        </label>
        <Controller
          name={fieldName}
          render={({ field: { onChange, value } }) => (
            <div className="w-full md:w-1/5">
              <CustomSelect
                value={value?.toString() || ""}
                onValueChange={(selectedValue) => {
                  onChange(selectedValue ? parseInt(selectedValue) : null);
                  if (fieldName === "restrictionScheduleId" && selectedValue) {
                    formMethods.setValue("restrictionScheduleId", parseInt(selectedValue), {
                      shouldDirty: true,
                    });
                  }
                }}
                options={options.map((opt) => ({
                  value: opt.value.toString(),
                  label: opt.isDefault
                    ? `${opt.label} (${t("default")})`
                    : opt.isManaged
                    ? `${opt.label} (${t("managed")})`
                    : opt.label,
                }))}
                placeholder={t("select")}
                disabled={shouldLockDisableProps(fieldName).disabled}
                className="bg-default"
              />
            </div>
          )}
        />
      </div>
    );
  }
);

ScheduleSelector.displayName = "ScheduleSelector";

/**
 * Team event specific UI with host schedules management
 */
const TeamEventSchedules = memo(
  ({
    eventType,
    user,
    teamMembers,
    hosts,
    scheduleOptions,
    scheduleQueryData,
    isSchedulePending,
    scheduleId,
    useHostSchedulesForTeamEvent,
    toggleScheduleState,
    shouldLockDisableProps,
    shouldLockIndicator,
    isManagedEventType,
    hostSchedulesQuery,
    t,
  }: {
    eventType: EventTypeSetup;
    user?: RouterOutputs["viewer"]["me"]["calid_get"];
    teamMembers: TeamMembers;
    hosts: Host[] | undefined;
    scheduleOptions: AvailabilityOption[];
    scheduleQueryData?: ScheduleQueryData;
    isSchedulePending: boolean;
    scheduleId: number | null;
    useHostSchedulesForTeamEvent: boolean;
    toggleScheduleState: (checked: boolean) => void;
    shouldLockDisableProps: (field: string) => { disabled: boolean };
    shouldLockIndicator: (field: string) => React.ReactNode;
    isManagedEventType: boolean;
    hostSchedulesQuery: GetAllSchedulesByUserIdQueryType;
    t: TFunction;
  }) => {
    const [animationRef] = useAutoAnimate<HTMLUListElement>();

    return (
      <div className="space-y-6">
        <SettingsSwitch
          checked={!useHostSchedulesForTeamEvent}
          onCheckedChange={toggleScheduleState}
          title={t("choose_common_schedule_team_event")}
          description={t("choose_common_schedule_team_event_description")}
        />

        {/* Common Schedule Selector */}
        {!useHostSchedulesForTeamEvent && (
          <div className="mt-4">
            <ScheduleSelector
              fieldName="schedule"
              options={scheduleOptions}
              shouldLockDisableProps={shouldLockDisableProps}
              shouldLockIndicator={shouldLockIndicator}
              isManagedEventType={isManagedEventType}
            />

            {/* Schedule Display or Managed Event Description */}
            {scheduleId !== 0 ? (
              <ScheduleDisplay
                scheduleQueryData={scheduleQueryData}
                isSchedulePending={isSchedulePending}
                user={user}
                editAvailabilityRedirectUrl={`/availability/${scheduleQueryData?.id}`}
              />
            ) : (
              isManagedEventType && (
                <p className="!mt-2 ml-1 text-sm text-gray-600">
                  {t("members_default_schedule_description")}
                </p>
              )
            )}
          </div>
        )}

        {/* Individual Host Schedules */}
        {useHostSchedulesForTeamEvent && (
          <div className="">
            <div className="border-subtle flex flex-col rounded-md">
              <div className="border-subtle mt-5 rounded-t-md border p-6 pb-5">
                <Label className="mb-1 text-sm font-semibold">{t("choose_hosts_schedule")}</Label>
                <p className="text-subtle max-w-full break-words text-sm leading-tight">
                  {t("hosts_schedule_description")}
                </p>
              </div>
              <div className="border-subtle rounded-b-md border border-t-0 p-6">
                {hosts && hosts.length > 0 ? (
                  <ul
                    className={`mb-4 mt-3 rounded-md ${hosts.length >= 1 ? "border-subtle border" : ""}`}
                    ref={animationRef}>
                    {hosts.map((host, index) => (
                      <li
                        key={host.userId}
                        className={`flex flex-col px-3 py-2 ${
                          index === hosts.length - 1 ? "" : "border-subtle border-b"
                        }`}>
                        <TeamMemberSchedule
                          host={host}
                          index={index}
                          teamMembers={teamMembers}
                          hostScheduleQuery={hostSchedulesQuery}
                        />
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
          </div>
        )}
      </div>
    );
  }
);

TeamEventSchedules.displayName = "TeamEventSchedules";

/**
 * Restriction schedule management component
 */
const RestrictionScheduleSection = memo(
  ({
    restrictScheduleForHosts,
    toggleRestrictScheduleState,
    restrictionScheduleOptions,
    restrictionScheduleId,
    restrictionScheduleQueryData,
    isRestrictionSchedulePending,
    user,
    eventType,
    shouldLockDisableProps,
    shouldLockIndicator,
    isManagedEventType,
    t,
  }: {
    restrictScheduleForHosts: boolean;
    toggleRestrictScheduleState: (checked: boolean) => void;
    restrictionScheduleOptions: AvailabilityOption[];
    restrictionScheduleId: number | null;
    restrictionScheduleQueryData?: ScheduleQueryData;
    isRestrictionSchedulePending: boolean;
    user?: RouterOutputs["viewer"]["me"]["calid_get"];
    eventType: EventTypeSetup;
    shouldLockDisableProps: (field: string) => { disabled: boolean };
    shouldLockIndicator: (field: string) => React.ReactNode;
    isManagedEventType: boolean;
    t: TFunction;
  }) => (
    <div className="space-y-6">
      <SettingsSwitch
        checked={restrictScheduleForHosts}
        onCheckedChange={toggleRestrictScheduleState}
        title={t("choose_restriction_schedule")}
        description={t("restriction_schedule_description")}
      />

      {restrictScheduleForHosts && (
        <div className="mt-4">
          <ScheduleSelector
            fieldName="restrictionScheduleId"
            options={restrictionScheduleOptions}
            shouldLockDisableProps={shouldLockDisableProps}
            shouldLockIndicator={shouldLockIndicator}
            isManagedEventType={isManagedEventType}
          />

          {restrictionScheduleId && (
            <ScheduleDisplay
              scheduleQueryData={restrictionScheduleQueryData}
              isSchedulePending={isRestrictionSchedulePending}
              user={user}
              editAvailabilityRedirectUrl={`/availability/${restrictionScheduleQueryData?.id}`}
              isRestrictionSchedule={true}
              useBookerTimezone={eventType.useBookerTimezone}
            />
          )}
        </div>
      )}
    </div>
  )
);

RestrictionScheduleSection.displayName = "RestrictionScheduleSection";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Main EventAvailability component that handles schedule management for events
 * Supports both individual and team events with restriction schedules
 */
export const EventAvailability = (props: EventAvailabilityProps) => {
  const { eventType, isTeamEvent, user, teamMembers } = props;
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const isPlatform = useIsPlatform();

  // Watch form values for reactive updates
  const scheduleId = formMethods.watch("schedule");
  const restrictionScheduleId = formMethods.watch("restrictionScheduleId");
  const hosts = formMethods.watch("hosts");

  // Get locked fields manager for form field permissions
  const { isManagedEventType, isChildrenManagedEventType, shouldLockDisableProps, shouldLockIndicator } =
    useLockedFieldsManager({
      eventType,
      translate: t,
      formMethods,
    });

  // Initialize custom hooks for state management
  const { useHostSchedulesForTeamEvent, toggleScheduleState } = useCommonScheduleState(eventType.schedule);
  const { restrictScheduleForHosts, toggleRestrictScheduleState } = useRestrictionScheduleState(
    eventType.restrictionScheduleId
  );

  const hostSchedulesQuery =
    props.hostSchedulesQuery || trpc.viewer.availability.schedule.calid_getAllSchedulesByUserId.useQuery;

  const { data: isRestrictionScheduleEnabled = false } = trpc.viewer.features.checkTeamFeature.useQuery(
    {
      teamId: (eventType as any)?.team?.id || 0,
      feature: "restriction-schedule",
    },
    {
      enabled: !!(eventType as any)?.team?.id,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Get main schedule data
  const { isPending: isSchedulePending, data: scheduleQueryData } =
    trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId: scheduleId || (!isTeamEvent ? user?.defaultScheduleId : undefined) || undefined,
        isManagedEventType: isManagedEventType || isChildrenManagedEventType,
      },
      { enabled: !!scheduleId || (!isTeamEvent && !!user?.defaultScheduleId) }
    );

  // Get restriction schedule data
  const { isPending: isRestrictionSchedulePending, data: restrictionScheduleQueryData } =
    trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId: restrictionScheduleId || undefined,
        isManagedEventType: isManagedEventType || isChildrenManagedEventType,
      },
      { enabled: !!restrictionScheduleId }
    );

  // Get all available schedules
  const { data: schedulesQueryData, isPending: isSchedulesPending } =
    trpc.viewer.availability.list.useQuery(undefined);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Create main schedule options
  const scheduleOptions = useMemo(
    () =>
      createScheduleOptions(
        schedulesQueryData,
        isManagedEventType,
        isChildrenManagedEventType,
        scheduleId,
        eventType,
        t
      ),
    [
      schedulesQueryData,
      isManagedEventType,
      isChildrenManagedEventType,
      scheduleId,
      eventType.schedule,
      eventType.scheduleName,
      t,
    ]
  );

  // Create restriction schedule options (excluding current main schedule)
  const restrictionScheduleOptions = useMemo(() => {
    const baseOptions = scheduleOptions.filter((option) => option.value !== eventType.schedule);

    // Add current restriction schedule if not in the list
    if (
      eventType.restrictionScheduleId &&
      !schedulesQueryData?.schedules.find((schedule: any) => schedule.id === eventType.restrictionScheduleId)
    ) {
      baseOptions.push({
        value: eventType.restrictionScheduleId,
        label: eventType.restrictionScheduleName ?? t("default_schedule_name"),
        isDefault: false,
        isManaged: false,
      });
    }

    return baseOptions;
  }, [
    scheduleOptions,
    eventType.schedule,
    eventType.restrictionScheduleId,
    eventType.restrictionScheduleName,
    schedulesQueryData?.schedules,
    t,
  ]);

  // ============================================================================
  // SIDE EFFECTS
  // ============================================================================

  // Initialize default schedules when data loads
  useScheduleDefaults(
    schedulesQueryData,
    scheduleId,
    restrictionScheduleId,
    isManagedEventType,
    eventType,
    formMethods
  );

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================

  // Show loading state while schedules are being fetched
  if (isSchedulesPending) {
    return <SelectSkeletonLoader />;
  }

  // ============================================================================
  // TEAM EVENT RENDER (Non-managed scheduling type)
  // ============================================================================
  if (isTeamEvent && eventType.schedulingType !== SchedulingType.MANAGED) {
    return (
      <Card>
        <CardContent className="space-y-6">
          {/* Main Team Event Schedules */}
          <TeamEventSchedules
            eventType={eventType}
            user={user}
            teamMembers={teamMembers}
            hosts={hosts}
            scheduleOptions={scheduleOptions}
            scheduleQueryData={scheduleQueryData}
            isSchedulePending={isSchedulePending}
            scheduleId={scheduleId}
            useHostSchedulesForTeamEvent={useHostSchedulesForTeamEvent}
            toggleScheduleState={toggleScheduleState}
            shouldLockDisableProps={shouldLockDisableProps}
            shouldLockIndicator={shouldLockIndicator}
            isManagedEventType={isManagedEventType}
            hostSchedulesQuery={hostSchedulesQuery}
            t={t}
          />

          {/* Restriction Schedule for Team Events */}
          {!isPlatform && isRestrictionScheduleEnabled && (
            <>
              <Separator />
              <RestrictionScheduleSection
                restrictScheduleForHosts={restrictScheduleForHosts}
                toggleRestrictScheduleState={toggleRestrictScheduleState}
                restrictionScheduleOptions={restrictionScheduleOptions}
                restrictionScheduleId={restrictionScheduleId}
                restrictionScheduleQueryData={restrictionScheduleQueryData}
                isRestrictionSchedulePending={isRestrictionSchedulePending}
                user={user}
                eventType={eventType}
                shouldLockDisableProps={shouldLockDisableProps}
                shouldLockIndicator={shouldLockIndicator}
                isManagedEventType={isManagedEventType}
                t={t}
              />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // INDIVIDUAL EVENT RENDER (Single event or managed team event)
  // ============================================================================
  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Main Schedule Section */}
        <div>
          <ScheduleSelector
            fieldName="schedule"
            options={scheduleOptions}
            shouldLockDisableProps={shouldLockDisableProps}
            shouldLockIndicator={shouldLockIndicator}
            isManagedEventType={isManagedEventType || isChildrenManagedEventType}
          />

          {/* Schedule Display or Managed Event Description */}
          {scheduleId !== 0 ? (
            <ScheduleDisplay
              scheduleQueryData={scheduleQueryData}
              isSchedulePending={isSchedulePending}
              user={user}
              editAvailabilityRedirectUrl={`/availability/${scheduleQueryData?.id}`}
            />
          ) : (
            isManagedEventType && (
              <p className="!mt-2 ml-1 text-sm text-gray-600">{t("members_default_schedule_description")}</p>
            )
          )}
        </div>

        {/* Restriction Schedule for Individual Events */}
        {!isPlatform && isRestrictionScheduleEnabled && !isTeamEvent && (
          <>
            <Separator />
            <RestrictionScheduleSection
              restrictScheduleForHosts={restrictScheduleForHosts}
              toggleRestrictScheduleState={toggleRestrictScheduleState}
              restrictionScheduleOptions={restrictionScheduleOptions}
              restrictionScheduleId={restrictionScheduleId}
              restrictionScheduleQueryData={restrictionScheduleQueryData}
              isRestrictionSchedulePending={isRestrictionSchedulePending}
              user={user}
              eventType={eventType}
              shouldLockDisableProps={shouldLockDisableProps}
              shouldLockIndicator={shouldLockIndicator}
              isManagedEventType={isManagedEventType}
              t={t}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
