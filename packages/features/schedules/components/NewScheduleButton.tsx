import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import { Form } from "@calcom/ui/form/fields";
import { Button } from "@calcom/ui/components/button";
import showToast from "@calcom/ui/v2/core/notifications";

export function NewScheduleButton({ name = "new-schedule" }: { name?: string }) {
  const router = useRouter();
  const { t } = useLocale();

  const form = useForm<{
    name: string;
  }>();
  const { register } = form;
  const utils = trpc.useContext();

  const createMutation = trpc.useMutation("viewer.availability.schedule.create", {
    onSuccess: async ({ schedule }) => {
      await router.push("/availability/" + schedule.id);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
      utils.setQueryData(["viewer.availability.list"], (data) => {
        const newSchedule = { ...schedule, isDefault: false, availability: [] };
        if (!data)
          return {
            schedules: [newSchedule],
          };
        return {
          ...data,
          schedules: [...data.schedules, newSchedule],
        };
      });
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this event`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog name={name} clearQueryParamsOnClose={["copy-schedule-id"]}>
      <DialogTrigger asChild>
        <Button data-testid={name} StartIcon={Icon.FiPlus}>
          {t("new")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="mb-8">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {t("add_new_schedule")}
          </h3>
        </div>
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <div className="mt-3 space-y-2">
            <label htmlFor="label" className="block text-sm font-medium text-gray-700">
              {t("name")}
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                required
                className="block w-full rounded-sm border-gray-300 text-sm"
                placeholder={t("default_schedule_name")}
                {...register("name")}
              />
            </div>
          </div>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit" loading={createMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
