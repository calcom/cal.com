import type { FormValues } from "pages/event-types/[type]";
import { Controller, useFormContext } from "react-hook-form";
import type { OptionProps, SingleValueProps } from "react-select";
import { components } from "react-select";

import dayjs from "@calcom/dayjs";
import { NewScheduleButton } from "@calcom/features/schedules";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Badge, Button, Select, SettingsToggle, SkeletonText, EmptyScreen } from "@calcom/ui";
import { ExternalLink, Globe, Clock } from "@calcom/ui/components/icon";

import { SelectSkeletonLoader } from "@components/availability/SkeletonLoader";

type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
};

const Option = ({ ...props }: OptionProps<AvailabilityOption>) => {
  const { label, isDefault } = props.data;
  const { t } = useLocale();
  return (
    <components.Option {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          {t("default")}
        </Badge>
      )}
    </components.Option>
  );
};

const SingleValue = ({ ...props }: SingleValueProps<AvailabilityOption>) => {
  const { label, isDefault } = props.data;
  const { t } = useLocale();
  return (
    <components.SingleValue {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          {t("default")}
        </Badge>
      )}
    </components.SingleValue>
  );
};

const AvailabilitySelect = ({
  className = "",
  isLoading,
  schedules,
  ...props
}: {
  className?: string;
  name: string;
  value: number;
  isLoading: boolean;
  schedules: RouterOutputs["viewer"]["availability"]["list"]["schedules"] | [];
  onBlur: () => void;
  onChange: (value: AvailabilityOption | null) => void;
}) => {
  const { t } = useLocale();

  if (isLoading) {
    return <SelectSkeletonLoader />;
  }

  const options = schedules.map((schedule) => ({
    value: schedule.id,
    label: schedule.name,
    isDefault: schedule.isDefault,
  }));

  const value = options.find((option) =>
    props.value
      ? option.value === props.value
      : option.value === schedules.find((schedule) => schedule.isDefault)?.id
  );

  return (
    <Select
      placeholder={t("select")}
      options={options}
      isSearchable={false}
      onChange={props.onChange}
      className={classNames("block w-full min-w-0 flex-1 rounded-sm text-sm", className)}
      value={value}
      components={{ Option, SingleValue }}
      isMulti={false}
    />
  );
};

const format = (date: Date, hour12: boolean) =>
  Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric", hour12 }).format(
    new Date(dayjs.utc(date).format("YYYY-MM-DDTHH:mm:ss"))
  );

const EventTypeScheduleDetails = () => {
  const { data: loggedInUser } = useMeQuery();
  const timeFormat = loggedInUser?.timeFormat;
  const { t, i18n } = useLocale();
  const { watch } = useFormContext<FormValues>();

  const scheduleId = watch("schedule");

  const { isLoading, data: schedule } = trpc.viewer.availability.schedule.get.useQuery(
    { scheduleId: scheduleId || loggedInUser?.defaultScheduleId || undefined },
    { enabled: !!scheduleId || !!loggedInUser?.defaultScheduleId }
  );

  const filterDays = (dayNum: number) =>
    schedule?.schedule.filter((item) => item.days.includes((dayNum + 1) % 7)) || [];

  return (
    <div className="border-default space-y-4 rounded border px-6 pb-4">
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
                      <div className="ml-6">{format(dayRange.endTime, timeFormat === 12)}</div>
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
      <hr className="border-subtle" />
      <div className="flex flex-col justify-center gap-2 sm:flex-row sm:justify-between">
        <span className="text-default flex items-center justify-center text-sm sm:justify-start">
          <Globe className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
          {schedule?.timeZone || <SkeletonText className="block h-5 w-32" />}
        </span>
        {!!schedule?.id && (
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
};

const EventTypeSchedule = () => {
  const { t } = useLocale();
  const { data: schedules, isLoading } = trpc.viewer.availability.list.useQuery();

  if (!schedules?.schedules.length && !isLoading)
    return (
      <EmptyScreen
        Icon={Clock}
        headline={t("new_schedule_heading")}
        description={t("new_schedule_description")}
        buttonRaw={<NewScheduleButton fromEventType />}
        border={false}
      />
    );

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
          {t("availability")}
        </label>
        <Controller
          name="schedule"
          render={({ field }) => (
            <>
              <AvailabilitySelect
                value={field.value}
                onBlur={field.onBlur}
                name={field.name}
                schedules={schedules?.schedules || []}
                isLoading={isLoading}
                onChange={(selected) => {
                  field.onChange(selected?.value || null);
                }}
              />
            </>
          )}
        />
      </div>
      <EventTypeScheduleDetails />
    </div>
  );
};

const UseCommonScheduleSettingsToggle = () => {
  const { t } = useLocale();
  const { resetField, setValue } = useFormContext<FormValues>();
  return (
    <Controller
      name="metadata.config.useHostSchedulesForTeamEvent"
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          checked={!value}
          onCheckedChange={(checked) => {
            onChange(!checked);
            if (checked) {
              resetField("schedule");
            } else {
              setValue("schedule", null);
            }
          }}
          title={t("choose_common_schedule_team_event")}
          description={t("choose_common_schedule_team_event_description")}>
          <EventTypeSchedule />
        </SettingsToggle>
      )}
    />
  );
};

export const AvailabilityTab = ({ isTeamEvent }: { isTeamEvent: boolean }) => {
  return isTeamEvent ? <UseCommonScheduleSettingsToggle /> : <EventTypeSchedule />;
};
