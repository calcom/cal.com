import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { QueryCell } from "@lib/QueryCell";
import { DEFAULT_SCHEDULE } from "@lib/availability";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import Shell from "@components/Shell";
import { Form } from "@components/form/fields";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";
import Schedule from "@components/ui/form/Schedule";

dayjs.extend(utc);
dayjs.extend(timezone);

type FormValues = {
  schedule: ScheduleType;
};

export function AvailabilityForm(props: inferQueryOutput<"viewer.availability">) {
  const { t } = useLocale();

  const createSchedule = async ({ schedule }: FormValues) => {
    const res = await fetch(`/api/schedule`, {
      method: "POST",
      body: JSON.stringify({ schedule, timeZone: props.timeZone }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    showToast(t("availability_updated_successfully"), "success");
    return responseData.data;
  };

  const schema = z.object({
    schedule: z
      .object({
        start: z.date(),
        end: z.date(),
      })
      .superRefine((val, ctx) => {
        if (dayjs(val.end).isBefore(dayjs(val.start))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid entry: End time can not be before start time",
            path: ["end"],
          });
        }
      })
      .optional()
      .array()
      .array(),
  });

  const days = [
    t("sunday_time_error"),
    t("monday_time_error"),
    t("tuesday_time_error"),
    t("wednesday_time_error"),
    t("thursday_time_error"),
    t("friday_time_error"),
    t("saturday_time_error"),
  ];

  const form = useForm({
    defaultValues: {
      schedule: props.schedule || DEFAULT_SCHEDULE,
    },
    resolver: zodResolver(schema),
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      <Form
        form={form}
        handleSubmit={async (values) => {
          await createSchedule(values);
        }}
        className="col-span-3 space-y-2 lg:col-span-2">
        <div className="divide-y rounded-sm border border-gray-200 bg-white px-4 py-5 sm:p-6">
          <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">{t("change_start_end")}</h3>
          <Schedule name="schedule" />
        </div>
        {form.formState.errors.schedule && (
          <Alert
            className="mt-1"
            severity="error"
            message={
              days[form.formState.errors.schedule.length - 1] + " : " + t("error_end_time_before_start_time")
            }
          />
        )}
        <div className="text-right">
          <Button>{t("save")}</Button>
        </div>
      </Form>
      <div className="min-w-40 col-span-3 ltr:ml-2 rtl:mr-2 lg:col-span-1">
        <div className="rounded-sm border border-gray-200 px-4 py-5 sm:p-6 ">
          <h3 className="text-base font-medium leading-6 text-gray-900">
            {t("something_doesnt_look_right")}
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>{t("troubleshoot_availability")}</p>
          </div>
          <div className="mt-5">
            <Button href="/availability/troubleshoot" color="secondary">
              {t("launch_troubleshooter")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Availability() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.availability"]);
  return (
    <div>
      <Shell heading={t("availability")} subtitle={t("configure_availability")}>
        <QueryCell query={query} success={({ data }) => <AvailabilityForm {...data} />} />
      </Shell>
    </div>
  );
}
