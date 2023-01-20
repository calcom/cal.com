import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  Form,
  Icon,
  showToast,
} from "@calcom/ui";

export function NewScheduleButton({ name = "new-schedule" }: { name?: string }) {
  const router = useRouter();
  const { t } = useLocale();

  const form = useForm<{
    name: string;
  }>();
  const { register } = form;
  const utils = trpc.useContext();

  const createMutation = trpc.viewer.availability.schedule.create.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push("/availability/" + schedule.id);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
      utils.viewer.availability.list.setData(undefined, (data) => {
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
        <Button variant="fab" data-testid={name} StartIcon={Icon.FiPlus}>
          {t("new")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("add_new_schedule")}>
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <div className="space-y-2">
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
          <DialogFooter>
            <DialogClose />
            <Button type="submit" loading={createMutation.isLoading}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
