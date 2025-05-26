"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

interface ScheduleTimezoneUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
  onConfirm: () => void;
}

const ScheduleTimezoneUpdateDialog = ({
  open,
  onOpenChange,
  timeZone,
  onConfirm,
}: ScheduleTimezoneUpdateDialogProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateScheduleMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      showToast(t("settings_updated_successfully"), "success");
      await utils.viewer.me.invalidate();
      onConfirm();
      onOpenChange(false);
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
      setIsUpdating(false);
    },
  });

  const handleUpdateSchedule = () => {
    setIsUpdating(true);
    updateScheduleMutation.mutate({
      timeZone,
      updateDefaultScheduleTimeZone: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("update_default_schedule_timezone_question")}
        description={t("update_default_schedule_timezone_description")}
        type="creation">
        <DialogFooter showDivider>
          <DialogClose color="secondary">{t("dont_update")}</DialogClose>
          <Button color="primary" onClick={handleUpdateSchedule} loading={isUpdating}>
            {t("update_default_schedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleTimezoneUpdateDialog;
