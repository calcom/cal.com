import { useFieldArray, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { DateOverrideInputDialog, DateOverrideList } from "@calcom/features/schedules";
import Schedule from "@calcom/features/schedules/components/Schedule";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { Schedule as ScheduleType, TimeRange, WorkingHours } from "@calcom/types/schedule";
import {
  Alert,
  Button,
  Form,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  showToast,
  TimezoneSelect,
} from "@calcom/ui";

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

const DateOverride = ({ workingHours, disabled }: { workingHours: WorkingHours[]; disabled?: boolean }) => {
  const { userTimeFormat } = useSettings();

  const { append, replace, fields } = useFieldArray<AvailabilityFormValues, "dateOverrides">({
    name: "dateOverrides",
  });
  const excludedDates = fields.map((field) => dayjs(field.ranges[0].start).utc().format("YYYY-MM-DD"));
  const { t } = useLocale();
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
        />
        <DateOverrideInputDialog
          userTimeFormat={userTimeFormat}
          workingHours={workingHours}
          excludedDates={excludedDates}
          onChange={(ranges) => ranges.forEach((range) => append({ ranges: [range] }))}
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
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: hasEditPermission, isPending: loadingPermissions } =
    trpc.viewer.teams.hasEditPermissionForUser.useQuery({
      memberId: userId,
    });

  const { data, isPending } = props;

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.availability.listTeam.invalidate();
      showToast(t("success"), "success");
      props.onOpenChange(false);
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

  const watchTimezone = form.watch("timeZone");

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <Form
        form={form}
        id="availability-form"
        handleSubmit={async ({ dateOverrides, ...values }) => {
          // Just blocking on a UI side -> Backend will also do the validation
          if (!hasEditPermission) return;
          updateMutation.mutate({
            scheduleId: data.id,
            dateOverrides: dateOverrides.flatMap((override) => override.ranges),
            ...values,
          });
        }}>
        <SheetContent
          bottomActions={
            <>
              <Button color="secondary" className="w-full justify-center">
                {t("cancel")}
              </Button>
              <Button
                disabled={!hasEditPermission || !data.hasDefaultSchedule}
                className="w-full justify-center"
                type="submit"
                loading={updateMutation.isPending}
                form="availability-form">
                {t("save")}
              </Button>
            </>
          }>
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

          <div className="mt-4 flex flex-col space-y-4">
            <div>
              <Label className="text-emphasis">
                <>{t("timezone")}</>
              </Label>
              <TimezoneSelect
                id="timezone"
                isDisabled={!hasEditPermission || !data.hasDefaultSchedule}
                value={watchTimezone ?? "Europe/London"}
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
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Form>
    </Sheet>
  );
}
