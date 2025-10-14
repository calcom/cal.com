import { Fragment, useState, useRef, useEffect } from "react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import DateOverrideInputDialog from "@calcom/features/schedules/components/DateOverrideInputDialog";
import DateOverrideList from "@calcom/features/schedules/components/DateOverrideList";
import Schedule from "@calcom/features/schedules/components/Schedule";
import { formatTime } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { Schedule as ScheduleType, TimeRange, WorkingHours } from "@calcom/types/schedule";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

import type { SliderUser } from "./AvailabilitySliderTable";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser?: SliderUser | null;
}

type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};

const useSettings = () => {
  const { data } = useMeQuery();
  return {
    userTimeFormat: data?.timeFormat ?? 12,
  };
};

const DateOverride = ({
  workingHours,
  disabled,
  handleSubmit,
}: {
  workingHours: WorkingHours[];
  disabled?: boolean;
  handleSubmit: (data: AvailabilityFormValues) => void;
}) => {
  const { userTimeFormat } = useSettings();

  const { append, replace, fields } = useFieldArray<AvailabilityFormValues, "dateOverrides">({
    name: "dateOverrides",
  });
  const { getValues } = useFormContext();
  const excludedDates = fields.map((field) => dayjs(field.ranges[0].start).utc().format("YYYY-MM-DD"));
  const { t } = useLocale();

  const handleAvailabilityUpdate = async () => {
    const updatedValues = getValues() as AvailabilityFormValues;
    handleSubmit(updatedValues);
  };
  return (
    <div className="">
      <Label>{t("date_overrides")}</Label>
      <div className="space-y-2">
        <DateOverrideList
          excludedDates={excludedDates}
          replace={replace}
          fields={fields}
          hour12={Boolean(userTimeFormat === 12)}
          workingHours={workingHours}
          userTimeFormat={userTimeFormat}
          handleAvailabilityUpdate={handleAvailabilityUpdate}
        />
        <DateOverrideInputDialog
          userTimeFormat={userTimeFormat}
          workingHours={workingHours}
          excludedDates={excludedDates}
          onChange={(ranges) => {
            ranges.forEach((range) => append({ ranges: [range] }));
            handleAvailabilityUpdate();
          }}
          Trigger={
            <Button color="secondary" StartIcon="plus" data-testid="add-override" disabled={disabled}>
              {t("add_an_override")}
            </Button>
          }
        />
      </div>
    </div>
  );
};

export function AvailabilityEditSheet(props: Props) {
  // This sheet will not be rendered without a selected user
  const userId = props.selectedUser?.id as number;
  const { data, isPending } = trpc.viewer.availability.schedule.getScheduleByUserId.useQuery({
    userId: userId,
  });

  // TODO: reimplement Skeletons for this page in here
  if (isPending) return null;

  if (!data) return null;

  // We wait for the schedule to be loaded before rendering the form since `defaultValues`
  // cannot be redeclared after first render. And using `values` will trigger a form reset
  // when revalidating.
  return <AvailabilityEditSheetForm {...props} data={data} isPending={isPending} />;
}

type Data = RouterOutputs["viewer"]["availability"]["schedule"]["getScheduleByUserId"];
export function AvailabilityEditSheetForm(props: Props & { data: Data; isPending: boolean }) {
  // This sheet will not be rendered without a selected user
  const userId = props.selectedUser?.id as number;
  const {
    t,
    i18n: { language },
  } = useLocale();
  const utils = trpc.useUtils();

  const { data: hasEditPermission, isPending: loadingPermissions } =
    trpc.viewer.teams.hasEditPermissionForUser.useQuery({
      // memberId: userId,
      calIdMemberId: userId,
    });

  const { data, isPending } = props;

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async () => {
      // await utils.viewer.availability.listTeam.invalidate();
      await utils.viewer.calidTeams.calidListTeam.invalidate();
      showToast(t("success"), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const form = useForm<AvailabilityFormValues>({
    defaultValues: {
      ...data,
      timeZone: data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      schedule: data.availability || [],
    },
  });

  const [status, setStatus] = useState<"past" | "upcoming">("upcoming"); // State for the dropdown selection

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 10,
      filters: {
        status,
        ...(props.selectedUser && {
          // teamMember: { id: props.selectedUser?.id, email: props.selectedUser?.email },
          userIds: [props.selectedUser?.id],
        }),
      },
    },

    {
      // first render has status `undefined`
      enabled: !!hasEditPermission,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const watchTimezone = form.watch("timeZone");
  const bookingsDivRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const div = bookingsDivRef.current;
    const handleScroll = () => {
      const div = bookingsDivRef.current;
      if (div) {
        const isAtBottom = div.scrollHeight - div.scrollTop <= div.clientHeight + 1;
        if (isAtBottom) {
          query.fetchNextPage();
        }
      }
    };
    if (hasEditPermission && div) {
      div.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (div) {
        div.removeEventListener("scroll", handleScroll);
      }
    };
  }, [hasEditPermission, query]);

  useEffect(() => {
    if (query.data) {
      console.log("bookings", query.data.pages[0].bookings);
      console.log("Selected user:", props.selectedUser); // Add this
    }
  }, [query.data]);

  const handleSubmit = ({ dateOverrides, ...values }: AvailabilityFormValues) => {
    updateMutation.mutate({
      scheduleId: data.id,
      dateOverrides: dateOverrides.flatMap((override) => override.ranges),
      ...values,
    });
  };

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <Form
        form={form}
        id="availability-form"
        handleSubmit={async (data) => {
          // Just blocking on a UI side -> Backend will also do the validation
          if (!hasEditPermission) return;
          handleSubmit(data);
        }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {t("edit_users_availability", {
                username: props.selectedUser?.username ?? "Nameless user",
              })}
            </SheetTitle>
          </SheetHeader>
          {!data.hasDefaultSchedule && !isPending && hasEditPermission && (
            <div className="my-2">
              <Alert severity="warning" title={t("view_only_edit_availability_not_onboarded")} />
            </div>
          )}
          {!hasEditPermission && !loadingPermissions && (
            <div className="my-2">
              <Alert severity="warning" title={t("view_only_edit_availability")} />
            </div>
          )}

          <SheetBody className="mt-4 flex flex-col space-y-4 overflow-hidden">
            <div>
              <Label className="text-emphasis">
                <>{t("timezone")}</>
              </Label>
              <TimezoneSelect
                id="timezone"
                isDisabled={!hasEditPermission || !data.hasDefaultSchedule}
                value={watchTimezone ?? "Europe/London"}
                data-testid="timezone-select"
                onChange={(event) => {
                  if (event) form.setValue("timeZone", event.value, { shouldDirty: true });
                }}
              />
            </div>
            <div className="mt-4">
              <Label className="text-emphasis">{t("members_default_schedule")}</Label>
              {/* Remove padding from schedule without touching the component */}
              <div className="[&>*:first-child]:!p-0">
                <Schedule
                  control={form.control}
                  name="schedule"
                  weekStart={0}
                  disabled={!hasEditPermission || !data.hasDefaultSchedule}
                />
              </div>
            </div>
            <div className="mt-4">
              {data.workingHours && (
                <DateOverride
                  workingHours={data.workingHours}
                  disabled={!hasEditPermission || !data.hasDefaultSchedule}
                  handleSubmit={handleSubmit}
                />
              )}
            </div>
            {hasEditPermission && (
              <Fragment>
                <Label className="text-emphasis mt-4">{t("members_bookings")}</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "past" | "upcoming")}
                  className="bg-default text-default rounded-md !border !border-gray-300 px-3 py-2 text-sm dark:!border-gray-700">
                  <option value="past">Past</option>
                  <option value="upcoming">Upcoming</option>
                </select>
                <div className=" flex-1 overflow-y-auto overflow-x-clip" ref={bookingsDivRef}>
                  <div>
                    <div className=" h-full   py-2">
                      {query.isFetching && !query.data ? (
                        <div className="loader" />
                      ) : query.data && query.data.pages[0]?.bookings?.length > 0 ? (
                        <Fragment>
                          {query?.data?.pages.map((page, i) => (
                            <Fragment key={i}>
                              {page.bookings.map((booking) => {
                                const userTimeZone =
                                  data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                                const date = dayjs(booking.startTime)
                                  .tz(userTimeZone)
                                  .locale(language)
                                  .format("D MMM");
                                const slotTime = `${formatTime(booking.startTime, 12, userTimeZone)} -
                                ${formatTime(booking.endTime, 12, userTimeZone)}`;
                                const joinLink = isPrismaObjOrUndefined(booking.metadata)?.videoCallUrl;
                                return (
                                  <div
                                    className="flex w-full justify-between border-b border-b-gray-300   py-2"
                                    key={booking.uid}>
                                    <div className="flex flex-col gap-1">
                                      <p className="text-sm ">
                                        <span className="font-medium">{t("event_name")} : </span>
                                        {booking.eventType.title}{" "}
                                      </p>
                                      <p className="text-sm ">
                                        <span className="font-medium">{t("at")} : </span>
                                        {slotTime} , {date}
                                      </p>
                                      <p className="text-sm ">
                                        <span className="font-medium">{t("attendees")} : </span>

                                        {booking.attendees.map((attendee) => attendee.name).join(",")}
                                      </p>
                                    </div>
                                    <div className="flex  flex-col items-center justify-center">
                                      {status == "upcoming" && joinLink ? (
                                        <Button
                                          color="minimal"
                                          onClick={() => window.open(joinLink as string, "_blank")}>
                                          {t("join_meeting")}
                                        </Button>
                                      ) : (
                                        <p className="mr-2 capitalize">
                                          {booking.location?.replace("integrations:", "")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </Fragment>
                          ))}
                          {query.hasNextPage ? (
                            <div className="loader" />
                          ) : (
                            <p className="text-emphasis mt-2 text-center text-sm">No More Bookings</p>
                          )}
                        </Fragment>
                      ) : (
                        <p className="text-emphasis">No Bookings</p>
                      )}
                    </div>
                  </div>
                </div>
              </Fragment>
            )}
          </SheetBody>
          <SheetFooter>
            <SheetClose asChild>
              <Button color="secondary" className="w-full justify-center">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button
              disabled={!hasEditPermission || !data.hasDefaultSchedule}
              className="w-full justify-center"
              type="submit"
              loading={updateMutation.isPending}
              form="availability-form">
              {t("save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Form>
    </Sheet>
  );
}
