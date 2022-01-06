import { useForm } from "react-hook-form";

import { QueryCell } from "@lib/QueryCell";
import { DEFAULT_SCHEDULE } from "@lib/availability";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import Shell from "@components/Shell";
import { Form } from "@components/form/fields";
import Button from "@components/ui/Button";
import Schedule from "@components/ui/form/Schedule";

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
      schedule: props.schedule || DEFAULT_SCHEDULE,
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
        <div className="px-4 py-5 bg-white border border-gray-200 divide-y rounded-sm sm:p-6">
          <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">{t("change_start_end")}</h3>
          <Schedule name="schedule" />
        </div>
        <div className="text-right">
          <Button>{t("save")}</Button>
        </div>
      </Form>
      <div className="col-span-3 ml-2 lg:col-span-1 min-w-40">
        <div className="px-4 py-5 border border-gray-200 rounded-sm sm:p-6 ">
          <h3 className="text-base font-medium leading-6 text-gray-900">
            {t("something_doesnt_look_right")}
          </h3>
          <div className="max-w-xl mt-2 text-sm text-gray-500">
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
