import { PlusIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { Button } from "@calcom/ui";

import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@components/Dialog";
import { Form, TextField } from "@components/form/fields";

export function NewScheduleButton() {
  const router = useRouter();
  const { t } = useLocale();

  const form = useForm<{
    name: string;
  }>();
  const { register } = form;

  const createMutation = trpc.useMutation("viewer.availability.schedule.create", {
    onSuccess: async ({ schedule }) => {
      await router.push("/availability/" + schedule.id);
      showToast(t("event_type_created_successfully", { scheduleName: schedule.name }), "success");
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
    <Dialog name="new-schedule" clearQueryParamsOnClose={["copy-schedule-id"]}>
      <DialogTrigger asChild>
        <Button data-testid="new-schedule" StartIcon={PlusIcon}>
          {t("new_schedule_btn")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="mb-4">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {t("add_new_schedule")}
          </h3>
          <div>
            <p className="text-sm text-gray-500">{t("new_event_type_to_book_description")}</p>
          </div>
        </div>
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <div className="mt-3 space-y-4">
            <TextField label={t("name")} {...register("name")} />
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
