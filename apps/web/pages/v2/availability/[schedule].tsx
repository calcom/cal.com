import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import Schedule from "@calcom/features/schedules/components/Schedule";
import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { Schedule as ScheduleType } from "@calcom/types/schedule";
import { Icon } from "@calcom/ui";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import Button from "@calcom/ui/v2/core/Button";
import Shell from "@calcom/ui/v2/core/Shell";
import Switch from "@calcom/ui/v2/core/Switch";
import VerticalDivider from "@calcom/ui/v2/core/VerticalDivider";
import { Form, Label } from "@calcom/ui/v2/core/form/fields";
import showToast from "@calcom/ui/v2/core/notifications";
import { SkeletonText } from "@calcom/ui/v2/core/skeleton";

import { HttpError } from "@lib/core/http/error";

import EditableHeading from "@components/ui/EditableHeading";

const querySchema = z.object({
  schedule: stringOrNumber,
});

type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  timeZone: string;
  isDefault: boolean;
};

export default function Availability({ schedule }: { schedule: number }) {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const { data, isLoading } = trpc.useQuery(["viewer.availability.schedule", { scheduleId: schedule }]);

  const form = useForm<AvailabilityFormValues>();
  const { control, reset, setValue } = form;

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
      title={t("availability_title", { availabilityTitle: data?.schedule.name })}
      heading={
        <EditableHeading title={data?.schedule.name || ""} onChange={(name) => setValue("name", name)} />
      }
      subtitle={data?.schedule.availability.map((availability) => (
        <span key={availability.id}>
          {availabilityAsString(availability, { locale: i18n.language })}
          <br />
        </span>
      ))}
      CTA={
        <div className="flex items-center justify-end">
          <div className="flex items-center rounded-md px-2 sm:hover:bg-gray-100">
            <Label htmlFor="hiddenSwitch" className="mt-2 hidden cursor-pointer self-center pr-2 sm:inline">
              {t("set_to_default")}
            </Label>
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
              <div className="rounded-md border-gray-200 bg-white py-5 pr-4 sm:border sm:p-6">
                <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">
                  {t("change_start_end")}
                </h3>
                <Schedule control={control} name="schedule" />
              </div>
            </div>
            <div className="min-w-40 col-span-3 space-y-2 lg:col-span-1">
              <div className="xl:max-w-80 w-full pr-4 sm:p-0">
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
                          className="focus:border-brand mt-1 block rounded-md border-gray-300 text-sm"
                          onChange={(timezone) => onChange(timezone.value)}
                        />
                      ) : (
                        <SkeletonText className="h-6 w-full" />
                      )
                    }
                  />
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
