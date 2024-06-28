import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import type { Props, OptionProps, SingleValueProps } from "react-select";
import { components } from "react-select";

import type { FormValues, Host, AvailabilityOption } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  Badge,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Icon,
  Label,
  Select,
  Tooltip,
} from "@calcom/ui";
import { SelectSkeletonLoader } from "@calcom/web/components/availability/SkeletonLoader";

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

const CheckedTeamMemberAvailability = ({
  selectedHostOption,
}: {
  selectedHostOption: CheckedSelectOption;
}) => {
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();
  const { watch, setValue, getValues } = formMethods;
  const watchScheduleConfig = watch("metadata.config.useHostSchedulesForTeamEvent");
  const watchHosts = getValues("hosts");

  const getIdx = () =>
    Math.max(
      watchHosts.findIndex((host) => host.userId === parseInt(selectedHostOption.value, 10)),
      0
    );

  const [options, setOptions] = useState<AvailabilityOption[]>([]);
  const { data, isPending } = trpc.viewer.availability.schedule.getAllSchedulesByUserId.useQuery({
    userId: parseInt(selectedHostOption.value, 10),
  });
  const [availabilityValue, setAvailabilityValue] = useState(watchHosts[getIdx()]?.availability);

  const updateSchedule = () => {
    if (!data) {
      return;
    }

    if (!watchScheduleConfig) {
      setValue(`hosts.${getIdx()}.scheduleId`, null, { shouldDirty: true });
      return;
    }

    const schedules = data.schedules;
    console.log(schedules);
    const scheduleOptions = schedules.map((schedule) => ({
      value: schedule.id,
      label: schedule.name,
      isDefault: schedule.isDefault,
      isManaged: false,
    }));

    setOptions(scheduleOptions);

    //select defaultSchedule if Host Schedule is not previously selected
    const scheduleId = getValues(`hosts.${getIdx()}.scheduleId`);
    const availability = getValues(`hosts.${getIdx()}.availability`);
    console.log(availability);

    const value = scheduleOptions.find((option) =>
      scheduleId
        ? option.value === scheduleId
        : availability
        ? option.value === availability?.value
        : option.value === schedules.find((schedule) => schedule.isDefault)?.id
    );

    if (!scheduleId) {
      setValue(`hosts.${getIdx()}.scheduleId`, value?.value || null, { shouldDirty: true });
      setValue(`hosts.${getIdx()}.availability`, value || null, { shouldDirty: true });
    }

    if (!availability) {
      setValue(`hosts.${getIdx()}.availability`, value || null, { shouldDirty: true });
    }

    setAvailabilityValue(value || null);
    selectedHostOption.availabilityOption = value;
  };

  useEffect(() => {
    updateSchedule();
  }, [data, watchScheduleConfig, watchHosts]);

  useEffect(() => {
    if (availabilityValue?.value) {
      selectedHostOption.availabilityOption = availabilityValue;
    }
  }, [availabilityValue, setAvailabilityValue]);

  return (
    <>
      {watchScheduleConfig && (
        <div className="mt-2 flex w-full flex-col pt-2 ">
          <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
            {t("availability")}
          </label>
          {isPending && <SelectSkeletonLoader />}
          {!isPending && (
            <Controller<FormValues>
              name={`hosts.${getIdx()}.scheduleId`}
              render={({ field }) => {
                return (
                  <Select
                    placeholder={t("select")}
                    options={options}
                    isSearchable={false}
                    onChange={(selected) => {
                      field.onChange(selected?.value || null);
                      if (selected?.value) {
                        const idx = watchHosts.findIndex(
                          (host) => host.userId === parseInt(selectedHostOption.value, 10)
                        );
                        setValue(`hosts.${idx}.availability`, selected, { shouldDirty: true });
                        setAvailabilityValue(selected);
                      }
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
      )}
    </>
  );
};

export type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  priority?: number;
  isFixed?: boolean;
  disabled?: boolean;
  availabilityOption?: AvailabilityOption | null;
};

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
}) => {
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [currentOption, setCurrentOption] = useState(value[0] ?? null);

  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  const formMethods = useFormContext<FormValues>();
  const { watch } = formMethods;
  const watchAssignAllTeamMembers = watch("assignAllTeamMembers");

  return (
    <>
      <Select
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={value}
        isMulti
        isDisabled={watchAssignAllTeamMembers}
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames("mb-4 mt-3 rounded-md", value.length >= 1 && "border-subtle border")}
        ref={animationRef}>
        {value.map((option, index) => (
          <>
            <li
              key={option.value}
              className={`flex flex-col px-3 py-2 ${
                index === value.length - 1 ? "" : "border-subtle border-b"
              }`}>
              <div className="flex w-full items-center">
                <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
                <p className="text-emphasis my-auto ms-3 text-sm">{option.label}</p>
                <div className="ml-auto flex items-center">
                  {option && !option.isFixed ? (
                    <Tooltip content={t("change_priority")}>
                      <Button
                        color="minimal"
                        onClick={() => {
                          setPriorityDialogOpen(true);
                          setCurrentOption(option);
                        }}
                        className={classNames(
                          "mr-6 h-2 p-0 text-sm hover:bg-transparent",
                          getPriorityTextAndColor(option.priority).color
                        )}>
                        {t(getPriorityTextAndColor(option.priority).text)}
                      </Button>
                    </Tooltip>
                  ) : (
                    <></>
                  )}
                  {!watchAssignAllTeamMembers ? (
                    <Icon
                      name="x"
                      onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                      className="my-auto h-4 w-4"
                    />
                  ) : (
                    <></>
                  )}
                </div>
              </div>
              <CheckedTeamMemberAvailability selectedHostOption={option} />
            </li>
          </>
        ))}
      </ul>
      {currentOption && !currentOption.isFixed ? (
        <PriorityDialog
          isOpenDialog={priorityDialogOpen}
          setIsOpenDialog={setPriorityDialogOpen}
          option={currentOption}
          onChange={props.onChange}
        />
      ) : (
        <></>
      )}
    </>
  );
};

interface IPriiorityDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  option: CheckedSelectOption;
  onChange: (value: readonly CheckedSelectOption[]) => void;
}

const PriorityDialog = (props: IPriiorityDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, onChange } = props;
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
      const updatedHosts = hosts
        .filter((host) => !host.isFixed)
        .map((host) => {
          return {
            ...option,
            value: host.userId.toString(),
            priority: host.userId === parseInt(option.value, 10) ? newPriority.value : host.priority,
            isFixed: false,
            scheduleId: host.scheduleId,
            availabilityOption: host.availability || null,
          };
        })
        .sort((a, b) => b.priority ?? 2 - a.priority ?? 2);
      onChange(updatedHosts);
    }
    setIsOpenDialog(false);
  };
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_priority")}>
        <div className="mb-4">
          <Label>{t("priority_for_user", { userName: option.label })}</Label>
          <Select
            defaultValue={priorityOptions[option.priority ?? 2]}
            value={newPriority}
            onChange={(value) => setNewPriority(value ?? priorityOptions[2])}
            options={priorityOptions}
          />
        </div>

        <DialogFooter>
          <DialogClose />
          <Button onClick={setPriority}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getPriorityTextAndColor = (priority?: number) => {
  switch (priority) {
    case 0:
      return { text: "lowest", color: "text-gray-300" };
    case 1:
      return { text: "low", color: "text-gray-400" };
    case 2:
      return { text: "medium", color: "text-gray-500" };
    case 3:
      return { text: "high", color: "text-gray-600" };
    case 4:
      return { text: "highest", color: "text-gray-700" };
    default:
      return { text: "medium", color: "text-gray-500" };
  }
};

export default CheckedTeamSelect;
