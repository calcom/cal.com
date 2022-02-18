import { PencilIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import TimezoneSelect, { ITimezoneOption } from "react-timezone-select";

import { QueryCell } from "@lib/QueryCell";
import { DEFAULT_SCHEDULE } from "@lib/availability";
import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import Shell from "@components/Shell";
import Schedule from "@components/availability/Schedule";
import { Form } from "@components/form/fields";
import Button from "@components/ui/Button";
import EditableHeading from "@components/ui/EditableHeading";
import Switch from "@components/ui/Switch";

type FormValues = {
  schedule: ScheduleType;
};

export function AvailabilityForm(props: inferQueryOutput<"viewer.availability">) {
  const { t } = useLocale();
  const [timeZone, setTimeZone] = useState(props.timeZone);
  const router = useRouter();

  const updateMutation = trpc.useMutation("viewer.schedule.update", {
    onSuccess: async () => {
      await router.push("/availability");
      showToast(t("availability_updated_successfully"), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const form = useForm({
    defaultValues: {
      schedule: props.availability || DEFAULT_SCHEDULE,
    },
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      <Form
        form={form}
        handleSubmit={async (values) => {
          updateMutation.mutate({
            scheduleId: parseInt(router.query.schedule as string, 10),
            schedule: values.schedule,
            timeZone: timeZone !== props.timeZone ? timeZone : undefined,
          });
        }}
        className="col-span-3 space-y-2 lg:col-span-2">
        <div className="divide-y rounded-sm border border-gray-200 bg-white px-4 py-5 sm:p-6">
          <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">{t("change_start_end")}</h3>
          <Schedule name="schedule" />
        </div>
        <div className="space-x-2 text-right">
          <Button color="secondary" href="/availability" tabIndex={-1}>
            {t("cancel")}
          </Button>
          <Button>{t("save")}</Button>
        </div>
      </Form>
      <div className="min-w-40 col-span-3 ml-2 space-y-4 lg:col-span-1">
        <Switch
          defaultChecked={!!props.isDefault}
          onCheckedChange={(isChecked) => {
            console.log("Set to default", isChecked);
          }}
          label={t("set_to_default")}
        />
        <div>
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            {t("timezone")}
          </label>
          <div className="mt-1">
            <TimezoneSelect
              id="timeZone"
              value={timeZone}
              onChange={(tz: ITimezoneOption) => setTimeZone(tz.value)}
              className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
            />
          </div>
        </div>
        <div className="mt-2 rounded-sm border border-gray-200 px-4 py-5 sm:p-6 ">
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
  const router = useRouter();
  const query = trpc.useQuery([
    "viewer.availability",
    {
      scheduleId: parseInt(router.query.schedule as string),
    },
  ]);
  return (
    <div>
      <QueryCell
        query={query}
        success={({ data }) => {
          return (
            <Shell heading={<EditableHeading title={data.schedule.name} />}>
              <AvailabilityForm {...data} />
            </Shell>
          );
        }}
      />
    </div>
  );
}
