import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import { Form } from "@calid/features/ui/components/form";
import { InputField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";

export function NewScheduleButton({
  name = "new-schedule",
  fromEventType,
}: {
  name?: string;
  fromEventType?: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();

  const form = useForm<{
    name: string;
  }>();
  const { register } = form;
  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.availability.schedule.create.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push(`/availability/${schedule.id}${fromEventType ? "?fromEventType=true" : ""}`);
      triggerToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
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
        triggerToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_schedule_unauthorized_create")}`;
        triggerToast(message, "error");
      }
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="fab" data-testid={name} StartIcon="plus" size="sm">
          {t("new")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add_new_schedule")}</DialogTitle>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <InputField
            label={t("name")}
            type="text"
            id="name"
            required
            placeholder={t("default_schedule_name")}
            {...register("name")}
          />
          <DialogFooter className="mt-4">
            <DialogClose />
            <Button type="submit" loading={createMutation.isPending}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
