import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { QueryCell } from "@lib/QueryCell";
import { DEFAULT_SCHEDULE } from "@lib/availability";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import Shell from "@components/Shell";
import Schedule from "@components/availability/Schedule";
import { Form } from "@components/form/fields";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";

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
          await createSchedule(values);
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
      <div className="min-w-40 col-span-3 ml-2 lg:col-span-1">
        <Switch
          defaultChecked={!!props.isDefault}
          onCheckedChange={(isChecked) => {
            console.log("Set to default", isChecked);
          }}
          label={t("set_to_default")}
        />
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
  const { t } = useLocale();
  const router = useRouter();
  const query = trpc.useQuery([
    "viewer.availability",
    {
      scheduleId: parseInt(router.query.availability as string),
    },
  ]);
  return (
    <div>
      <Shell heading={t("availability")} subtitle={t("configure_availability")}>
        <QueryCell query={query} success={({ data }) => <AvailabilityForm {...data} />} />
      </Shell>
    </div>
  );
}
