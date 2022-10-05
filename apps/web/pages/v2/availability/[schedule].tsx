import { DropdownMenuCheckboxItemProps, DropdownMenuItemIndicator } from "@radix-ui/react-dropdown-menu";
import classNames from "classnames";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import Schedule from "@calcom/features/schedules/components/Schedule";
import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { Schedule as ScheduleType } from "@calcom/types/schedule";
import { Icon } from "@calcom/ui";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import Button from "@calcom/ui/v2/core/Button";
import Dropdown, {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem as PrimitiveDropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@calcom/ui/v2/core/Dropdown";
import Shell from "@calcom/ui/v2/core/Shell";
import Switch from "@calcom/ui/v2/core/Switch";
import VerticalDivider from "@calcom/ui/v2/core/VerticalDivider";
import { Form, Label } from "@calcom/ui/v2/core/form/fields";
import showToast from "@calcom/ui/v2/core/notifications";
import { Skeleton, SkeletonText } from "@calcom/ui/v2/core/skeleton";

import { HttpError } from "@lib/core/http/error";

import EditableHeading from "@components/ui/EditableHeading";
import { SelectSkeletonLoader } from "@components/v2/availability/SkeletonLoader";

const querySchema = z.object({
  schedule: stringOrNumber,
});

type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  timeZone: string;
  isDefault: boolean;
};

type EventTypeGroup = { groupName: string; eventTypes: { title: string; isActive: boolean; id: number }[] };

export const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ children, defaultChecked, disabled, ...passThroughProps }, forwardedRef) => {
    const [checked, setChecked] = useState(defaultChecked);
    return (
      <PrimitiveDropdownMenuCheckboxItem
        ref={forwardedRef}
        className="flex w-full items-center justify-between space-x-4 p-1 font-normal"
        checked={checked}
        onCheckedChange={(checked) => {
          setChecked(checked);
          passThroughProps.onCheckedChange && passThroughProps.onCheckedChange(checked);
        }}
        disabled={defaultChecked && disabled}
        ItemIndicator={() => (
          <DropdownMenuItemIndicator asChild>
            <span className="hidden" />
          </DropdownMenuItemIndicator>
        )}
        onSelect={(e) => e.preventDefault()}>
        {children}
        <input
          readOnly
          disabled={defaultChecked && disabled}
          type="checkbox"
          checked={checked}
          className="inline-block rounded-[4px] border-gray-300 text-neutral-900 focus:ring-neutral-500 disabled:text-neutral-400"
        />
      </PrimitiveDropdownMenuCheckboxItem>
    );
  }
);

DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const ActiveOnEventTypeSelect = ({ scheduleId, isDefault }: { scheduleId: number; isDefault: boolean }) => {
  const { t } = useLocale();
  // I was doubtful to make this RHF but this has no point: because the DropdownMenuCheckboxItem is
  // controlled anyway; requiring the use of Controller regardless.
  const [eventTypeIds, setEventTypeIds] = useState<{ [K: number]: boolean }>({});
  const [isOpen, setOpen] = useState(false);
  const { data } = trpc.useQuery(["viewer.eventTypes"]);
  const mutation = trpc.useMutation("viewer.availability.switchActiveOnEventTypes");
  const { data: user } = useMeQuery();
  const utils = trpc.useContext();

  const eventTypeGroups = useMemo(
    () =>
      data?.eventTypeGroups.reduce((aggregate, eventTypeGroups) => {
        aggregate.push({
          groupName:
            eventTypeGroups.eventTypes[0].team?.name || eventTypeGroups.eventTypes[0].users[0].name || "",
          eventTypes: [
            ...eventTypeGroups.eventTypes.map((eventType) => ({
              title: eventType.title,
              id: eventType.id,
              isActive: eventType.scheduleId
                ? scheduleId === eventType.scheduleId
                : scheduleId === user?.defaultScheduleId,
            })),
          ],
        });

        return aggregate;
      }, [] as EventTypeGroup[]),
    [data?.eventTypeGroups, user?.defaultScheduleId, scheduleId]
  );

  useEffect(() => {
    if (!data) return;

    if (eventTypeGroups) {
      const eventTypeIdsLocal: { [K: number]: boolean } = {};
      for (const item of eventTypeGroups) {
        for (const eventType of item.eventTypes) {
          if (isDefault && !eventType.isActive) {
            eventTypeIdsLocal[eventType.id] = eventType.isActive;
          }
        }
      }
      setEventTypeIds(eventTypeIdsLocal);
    }
  }, [data, eventTypeGroups, isDefault]);

  return (
    <Dropdown onOpenChange={setOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="base"
          color="secondary"
          className="w-full px-3 !font-light sm:w-72"
          EndIcon={({ className, ...props }) =>
            isOpen ? (
              <Icon.FiChevronUp
                {...props}
                className={classNames(className, "!h-5 !w-5 !font-extrabold text-gray-300")}
              />
            ) : (
              <Icon.FiChevronDown
                {...props}
                className={classNames(className, "!h-5 !w-5 !font-extrabold text-gray-300")}
              />
            )
          }>
          {t("nr_event_type", {
            count: eventTypeGroups?.reduce(
              (count, group) => count + group.eventTypes.filter((eventType) => eventType.isActive).length,
              0
            ),
          })}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(eventTypeGroups || []).map((eventTypeGroup) => (
          <DropdownMenuGroup key={eventTypeGroup.groupName} className="space-y-3 p-4 px-3 sm:w-72">
            <DropdownMenuLabel asChild>
              <span className="h6 pb-3 pl-1 text-xs font-medium uppercase text-neutral-400">
                {eventTypeGroup.groupName}
              </span>
            </DropdownMenuLabel>
            {eventTypeGroup.eventTypes.map((eventType) => (
              <DropdownMenuCheckboxItem
                key={eventType.title}
                disabled={isDefault}
                defaultChecked={eventType.isActive}
                onCheckedChange={(checked) => setEventTypeIds({ ...eventTypeIds, [eventType.id]: checked })}>
                <span className="truncate">{eventType.title}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator asChild>
          <hr />
        </DropdownMenuSeparator>
        <div className="flex justify-end space-x-2 px-4 pt-3 pb-2">
          <Button color="minimalSecondary" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            type="submit"
            onClick={async () => {
              await mutation.mutate({
                scheduleId,
                eventTypeIds,
              });
              await utils.invalidateQueries("viewer.eventTypes");
            }}>
            {t("apply")}
          </Button>
        </div>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export default function Availability({ schedule }: { schedule: number }) {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const me = useMeQuery();

  const { data, isLoading } = trpc.useQuery(["viewer.availability.schedule", { scheduleId: schedule }]);

  const form = useForm<AvailabilityFormValues>();
  const { control, reset } = form;

  useEffect(() => {
    if (!isLoading && data) {
      reset({
        name: data?.schedule?.name,
        schedule: data.availability,
        timeZone: data.timeZone,
        isDefault: data.isDefault,
      });
    }
  }, [data, isLoading, reset]);

  const updateMutation = trpc.useMutation("viewer.availability.schedule.update", {
    onSuccess: async ({ schedule }) => {
      await utils.invalidateQueries(["viewer.availability.schedule"]);
      await utils.refetchQueries(["viewer.availability.schedule"]);
      await router.push("/availability");
      showToast(
        t("availability_updated_successfully", {
          scheduleName: schedule.name,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Shell
      backPath="/availability"
      title={data?.schedule.name && data.schedule.name + " | " + t("availability")}
      heading={
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <EditableHeading isReady={!isLoading} {...field} />}
        />
      }
      subtitle={
        data ? (
          data.schedule.availability.map((availability) => (
            <span key={availability.id}>
              {availabilityAsString(availability, { locale: i18n.language })}
              <br />
            </span>
          ))
        ) : (
          <SkeletonText className="h-4 w-48" />
        )
      }
      CTA={
        <div className="flex items-center justify-end">
          <div className="flex items-center rounded-md px-2 sm:hover:bg-gray-100">
            <Skeleton
              as={Label}
              htmlFor="hiddenSwitch"
              className="mt-2 hidden cursor-pointer self-center pr-2 sm:inline">
              {t("set_to_default")}
            </Skeleton>
            <Switch
              id="hiddenSwitch"
              disabled={isLoading}
              checked={form.watch("isDefault")}
              onCheckedChange={(e) => {
                form.setValue("isDefault", e);
              }}
            />
          </div>

          <VerticalDivider />

          <div className="border-l-2 border-gray-300" />
          <Button className="ml-4 lg:ml-0" type="submit" form="availability-form">
            {t("save")}
          </Button>
        </div>
      }>
      <div className="flex items-baseline sm:mt-0">
        {/* TODO: Find a better way to guarantee alignment, but for now this'll do. */}
        <Icon.FiArrowLeft className=" mr-3 text-transparent hover:cursor-pointer" />
        <div className="w-full">
          <Form
            form={form}
            id="availability-form"
            handleSubmit={async (values) => {
              updateMutation.mutate({
                scheduleId: schedule,
                ...values,
              });
            }}
            className="-mx-4 flex flex-col pb-16 sm:mx-0 xl:flex-row xl:space-x-6">
            <div className="flex-1">
              <div className="mb-4 rounded-md border-gray-200 bg-white py-5 pr-4 sm:border sm:p-6">
                <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">
                  {t("change_start_end")}
                </h3>
                {typeof me.data?.weekStart === "string" && (
                  <Schedule
                    control={control}
                    name="schedule"
                    weekStart={
                      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(
                        me.data?.weekStart
                      ) as 0 | 1 | 2 | 3 | 4 | 5 | 6
                    }
                  />
                )}
              </div>
            </div>
            <div className="min-w-40 col-span-3 space-y-2 lg:col-span-1">
              <div className="xl:max-w-80 w-full space-y-4 pr-4 sm:p-0">
                <div className="xl:max-w-80 w-full space-y-4 pr-4 sm:p-0">
                  <div>
                    <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                      {t("timezone")}
                    </label>
                    <Controller
                      name="timeZone"
                      render={({ field: { onChange, value } }) =>
                        value ? (
                          <TimezoneSelect
                            value={value}
                            className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 text-sm sm:w-72"
                            onChange={(timezone) => onChange(timezone.value)}
                          />
                        ) : (
                          <SelectSkeletonLoader className="w-full sm:w-72" />
                        )
                      }
                    />
                  </div>
                  <Label className="mt-1 cursor-pointer space-y-2 sm:w-full md:w-1/2 lg:w-full">
                    <span>Active on</span>
                    <ActiveOnEventTypeSelect isDefault={form.watch("isDefault")} scheduleId={schedule} />
                  </Label>
                </div>
                <hr className="my-8" />
                <div className="rounded-md">
                  <h3 className="text-sm font-medium text-gray-900">{t("something_doesnt_look_right")}</h3>
                  <div className="mt-3 flex">
                    <Button href="/availability/troubleshoot" color="secondary">
                      {t("launch_troubleshooter")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </Shell>
  );
}

export const getStaticProps: GetStaticProps = (ctx) => {
  const params = querySchema.safeParse(ctx.params);

  if (!params.success) return { notFound: true };

  return {
    props: {
      schedule: params.data.schedule,
    },
    revalidate: 10, // seconds
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};
