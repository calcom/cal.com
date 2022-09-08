import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Schedule } from "@calcom/features/schedules";
import { availabilityAsString, DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { BadgeCheckIcon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import { Button, Form, showToast, Switch, TextField } from "@calcom/ui/v2";

import { QueryCell } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";

import EditableHeading from "@components/ui/EditableHeading";

export function AvailabilityForm(props: inferQueryOutput<"viewer.availability.schedule">) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const form = useForm({
    defaultValues: {
      schedule: props.availability || DEFAULT_SCHEDULE,
      isDefault: !!props.isDefault,
      timeZone: props.timeZone,
    },
  });

  const updateMutation = trpc.useMutation("viewer.availability.schedule.update", {
    onSuccess: async ({ schedule }) => {
      await utils.invalidateQueries(["viewer.availability.schedule"]);
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
    <Form
      form={form}
      handleSubmit={async (values) => {
        updateMutation.mutate({
          scheduleId: parseInt(router.query.schedule as string, 10),
          name: props.schedule.name,
          ...values,
        });
      }}
      className="-mx-4 flex flex-col pb-16 sm:mx-0 xl:flex-row xl:space-x-6">
      <div className="flex-1">
        <div className="rounded-md border-gray-200 bg-white px-4 py-5 sm:border sm:p-6">
          <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">{t("change_start_end")}</h3>
          <Schedule />
        </div>
        <div className="flex justify-end px-4 pt-4 sm:px-0">
          <Button>{t("save")}</Button>
        </div>
      </div>
      <div className="min-w-40 col-span-3 ml-2 space-y-2 lg:col-span-1">
        {props.isDefault ? (
          <span className="flex items-center">
            <BadgeCheckIcon className="mr-1 h-4 w-4" /> {t("default")}
          </span>
        ) : (
          <Controller
            name="isDefault"
            render={({ field: { onChange, value } }) => (
              <Switch label={t("set_to_default")} onCheckedChange={onChange} checked={value} />
            )}
          />
        )}
        <div className="xl:max-w-80 w-full">
          <div>
            <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
              {t("timezone")}
            </label>
            <div className="mt-1">
              <Controller
                name="timeZone"
                render={({ field: { onChange, value } }) => (
                  <TimezoneSelect
                    value={value}
                    className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 text-sm"
                    onChange={(timezone) => onChange(timezone.value)}
                  />
                )}
              />
            </div>
          </div>
          <div className="pt-6">
            <TextField
              name="aciveOn"
              label={t("active_on")}
              disabled
              value={t("nr_event_type_other", { count: props.schedule.eventType?.length })}
              className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 text-sm"
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
  );
}

const querySchema = z.object({
  schedule: stringOrNumber,
});

export default function Availability() {
  const router = useRouter();
  const { i18n } = useLocale();
  const { schedule: scheduleId } = router.isReady ? querySchema.parse(router.query) : { schedule: -1 };
  const query = trpc.useQuery(["viewer.availability.schedule", { scheduleId }], { enabled: router.isReady });
  const [name, setName] = useState<string>();
  return (
    <div>
      <QueryCell
        query={query}
        success={({ data }) => {
          return (
            <Shell
              heading={<EditableHeading title={name || data.schedule.name} onChange={setName} />}
              subtitle={data.schedule.availability.map((availability) => (
                <span key={availability.id}>
                  {availabilityAsString(availability, { locale: i18n.language })}
                  <br />
                </span>
              ))}>
              <AvailabilityForm
                {...{ ...data, schedule: { ...data.schedule, name: name || data.schedule.name } }}
              />
            </Shell>
          );
        }}
      />
    </div>
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
