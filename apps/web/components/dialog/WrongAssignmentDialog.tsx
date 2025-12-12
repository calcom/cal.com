import type { Dispatch, SetStateAction } from "react";
import { Controller, useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface IWrongAssignmentDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  routingReason: string | null;
  guestEmail: string;
  hostEmail: string;
  hostName: string | null;
}

interface FormValues {
  correctAssignee: string;
  additionalNotes: string;
}

export const WrongAssignmentDialog = (props: IWrongAssignmentDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingUid, routingReason, guestEmail, hostEmail, hostName } = props;

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      correctAssignee: "",
      additionalNotes: "",
    },
  });

  const { mutate: reportWrongAssignment, isPending } =
    trpc.viewer.bookings.reportWrongAssignment.useMutation({
      async onSuccess() {
        showToast(t("wrong_assignment_reported"), "success");
        setIsOpenDialog(false);
        await utils.viewer.bookings.invalidate();
      },
      onError(error) {
        showToast(error.message || t("unexpected_error_try_again"), "error");
      },
    });

  const onSubmit = (data: FormValues) => {
    reportWrongAssignment({
      bookingUid,
      correctAssignee: data.correctAssignee || undefined,
      additionalNotes: data.additionalNotes || undefined,
    });
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-row space-x-3">
            <div className="w-full">
              <DialogHeader title={t("wrong_assignment")} />

              <div className="mb-4 space-y-3">
                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">
                    {t("routing_reason")}
                  </Label>
                  <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">
                    {routingReason || t("no_routing_reason")}
                  </p>
                </div>

                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">{t("guest")}</Label>
                  <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">{guestEmail}</p>
                </div>

                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">{t("host")}</Label>
                  <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">
                    {hostName ? `${hostName} (${hostEmail})` : hostEmail}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="correctAssignee" className="text-emphasis mb-2 block text-sm font-medium">
                  {t("who_should_have_received_it")}{" "}
                  <span className="text-subtle font-normal">({t("optional")})</span>
                </Label>
                <Controller
                  name="correctAssignee"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      placeholder={t("enter_email")}
                      className="border-default bg-default text-emphasis placeholder:text-muted focus:border-emphasis focus:ring-emphasis block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                    />
                  )}
                />
              </div>

              <div className="mb-4">
                <Label htmlFor="additionalNotes" className="text-emphasis mb-2 block text-sm font-medium">
                  {t("additional_notes")} <span className="text-subtle font-normal">({t("optional")})</span>
                </Label>
                <Controller
                  name="additionalNotes"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      placeholder={t("wrong_assignment_notes_placeholder")}
                      rows={3}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter showDivider className="mt-8">
            <Button
              type="button"
              color="secondary"
              onClick={() => setIsOpenDialog(false)}
              disabled={isPending}>
              {t("close")}
            </Button>
            <Button type="submit" color="primary" disabled={isPending} loading={isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
