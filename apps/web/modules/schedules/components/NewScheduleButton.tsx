import { revalidateAvailabilityList } from "app/(use-page-wrapper)/(main-nav)/availability/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogTrigger, DialogClose } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { InputField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import { GoogleWorkingLocationSyncModal } from "./GoogleWorkingLocationSyncModal";

export function NewScheduleButton({
  name = "new-schedule",
  fromEventType,
}: {
  name?: string;
  fromEventType?: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [showGoogleWorkingLocationModal, setShowGoogleWorkingLocationModal] = useState(false);

  const form = useForm<{
    name: string;
  }>();
  const { register } = form;
  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.availability.schedule.create.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push(`/availability/${schedule.id}${fromEventType ? "?fromEventType=true" : ""}`);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
      revalidateAvailabilityList();
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
        const message = `${err.data.code}: ${t("error_schedule_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <>
      <Dialog name={name} clearQueryParamsOnClose={["copy-schedule-id"]}>
        <DialogTrigger asChild>
          <Button variant="fab" data-testid={name} StartIcon="plus" size="sm">
            {t("new")}
          </Button>
        </DialogTrigger>
        <DialogContent title={t("add_new_schedule")}>
          <Form
            form={form}
            handleSubmit={(values) => {
              createMutation.mutate(values);
            }}>
            <InputField
              label={t("name")}
              type="text"
              id="name"
              required
              placeholder={t("default_schedule_name")}
              {...register("name", {
                setValueAs: (v) => (!v || v.trim() === "" ? null : v),
              })}
            />
            <DialogFooter>
              <DialogClose />
              <Button type="submit" loading={createMutation.isPending}>
                {t("continue")}
              </Button>
            </DialogFooter>
          </Form>

          {/* Google Working Location Sync Option */}
          <div className="border-subtle mt-6 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowGoogleWorkingLocationModal(true)}
              className="hover:bg-subtle text-default flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors">
              <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-md">
                <Icon name="calendar" className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{t("sync_with_google_working_location")}</p>
                <p className="text-subtle text-sm">{t("sync_with_google_working_location_description")}</p>
              </div>
              <Icon name="chevron-right" className="text-subtle h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <GoogleWorkingLocationSyncModal
        isOpen={showGoogleWorkingLocationModal}
        onClose={() => setShowGoogleWorkingLocationModal(false)}
      />
    </>
  );
}
