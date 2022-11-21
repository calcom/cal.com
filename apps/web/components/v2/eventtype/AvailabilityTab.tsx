import { FormValues } from "pages/event-types/[type]";
import { Controller, useFormContext } from "react-hook-form";
import { SingleValueProps, OptionProps, components } from "react-select";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Badge } from "@calcom/ui/v2";
import Button from "@calcom/ui/v2/core/Button";
import Select from "@calcom/ui/v2/core/form/select";
import { SkeletonText } from "@calcom/ui/v2/core/skeleton";

import { SelectSkeletonLoader } from "@components/v2/availability/SkeletonLoader";

type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
};

const Option = ({ ...props }: OptionProps<AvailabilityOption>) => {
  const { label, isDefault } = props.data;
  return (
    <components.Option {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          Default
        </Badge>
      )}
    </components.Option>
  );
};

const SingleValue = ({ ...props }: SingleValueProps<AvailabilityOption>) => {
  const { label, isDefault } = props.data;
  return (
    <components.SingleValue {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          Default
        </Badge>
      )}
    </components.SingleValue>
  );
};

const AvailabilitySelect = ({
  className = "",
  ...props
}: {
  className?: string;
  name: string;
  value: number;
  onBlur: () => void;
  onChange: (value: AvailabilityOption | null) => void;
}) => {
  const { data, isLoading } = trpc.useQuery(["viewer.availability.list"]);
  if (isLoading) {
    return <SelectSkeletonLoader />;
  }

  const schedules = data?.schedules || [];

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

const format = (date: Date) =>
  Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" }).format(
    new Date(dayjs.utc(date).format("YYYY-MM-DDTHH:mm:ss"))
  );

export const AvailabilityTab = () => {
  const { t, i18n } = useLocale();
  const { watch } = useFormContext<FormValues>();

  const scheduleId = watch("schedule");
  const { isLoading, data: schedule } = trpc.useQuery(["viewer.availability.schedule", { scheduleId }]);

  const filterDays = (dayNum: number) =>
    schedule?.schedule.availability.filter((item) => item.days.includes((dayNum + 1) % 7)) || [];

  return (
    <>
      <div>
        <div className="min-w-4 mb-2">
          <label htmlFor="availability" className="mt-0 flex text-sm font-medium text-neutral-700">
            {t("availability")}
          </label>
        </div>
        <Controller
          name="schedule"
          render={({ field }) => (
            <AvailabilitySelect
              value={field.value}
              onBlur={field.onBlur}
              name={field.name}
              onChange={(selected) => {
                field.onChange(selected?.value || null);
              }}
            />
          )}
        />
      </div>

      <div className="space-y-4 rounded border p-8 py-6 pt-2">
        <ol className="table border-collapse text-sm">
          {weekdayNames(i18n.language, 1, "long").map((day, index) => {
            const isAvailable = !!filterDays(index).length;
            return (
              <li key={day} className="my-6 flex border-transparent last:mb-2">
                <span className={classNames("w-32 font-medium", !isAvailable && "text-gray-500 opacity-50")}>
                  {day}
                </span>
                {isLoading ? (
                  <SkeletonText className="block h-5 w-60" />
                ) : isAvailable ? (
                  <div className="space-y-3">
                    {filterDays(index).map((dayRange, i) => (
                      <div key={i} className="flex items-center leading-4">
                        <span className="w-28">{format(dayRange.startTime)}</span>
                        <span className="">-</span>
                        <div className="ml-6">{format(dayRange.endTime)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 opacity-50 ">{t("unavailable")}</span>
                )}
              </li>
            );
          })}
        </ol>
        <hr />
        <div className="flex justify-between">
          <span className="flex items-center text-sm text-gray-600">
            <Icon.FiGlobe className="mr-2" />
            {schedule?.timeZone || <SkeletonText className="block h-5 w-32" />}
          </span>
          <Button
            href={`/availability/${schedule?.schedule.id}`}
            color="minimal"
            EndIcon={Icon.FiExternalLink}
            target="_blank"
            rel="noopener noreferrer">
            {t("edit_availability")}
          </Button>
        </div>
      </div>
    </>
  );
};
