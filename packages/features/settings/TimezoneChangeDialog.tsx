"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogFooter, showToast } from "@calcom/ui";

const TimezoneChangeDialogContent = ({
  onAction,
  browserTimezone,
}: {
  browserTimezone: string;
  onAction: (action?: "update" | "cancel") => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const formattedCurrentTz = browserTimezone.replace("_", " ");

  // save cookie to not show again
  function onCancel(hideFor: [number, dayjs.ManipulateType], toast: boolean) {
    onAction("cancel");
    document.cookie = `calcom-timezone-dialog=1;max-age=${
      dayjs().add(hideFor[0], hideFor[1]).unix() - dayjs().unix()
    }`;
    toast && showToast(t("we_wont_show_again"), "success");
  }

  const onSuccessMutation = async () => {
    showToast(t("updated_timezone_to", { formattedCurrentTz }), "success");
    await utils.viewer.me.invalidate();
  };

  const onErrorMutation = () => {
    showToast(t("couldnt_update_timezone"), "error");
  };

  // update timezone in db
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: onSuccessMutation,
    onError: onErrorMutation,
  });

  function updateTimezone() {
    onAction("update");
    mutation.mutate({
      timeZone: browserTimezone,
    });
  }

  return (
    <DialogContent
      title={t("update_timezone_question")}
      description={t("update_timezone_description", { formattedCurrentTz })}
      type="creation"
      onInteractOutside={() => onCancel([1, "day"], false) /* 1 day expire */}>
      {/* todo: save this in db and auto-update when timezone changes (be able to disable??? if yes, /settings)
        <Checkbox description="Always update timezone" />
        */}
      <div className="mb-8" />
      <DialogFooter showDivider>
        <DialogClose onClick={() => onCancel([3, "months"], true)} color="secondary">
          {t("dont_update")}
        </DialogClose>
        <DialogClose onClick={() => updateTimezone()} color="primary">
          {t("update_timezone")}
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export function useOpenTimezoneDialog() {
  const { data: user } = trpc.viewer.me.useQuery();
  const [showDialog, setShowDialog] = useState(false);
  const browserTimezone = dayjs.tz.guess() || "Europe/London";
  const { isLocaleReady } = useLocale();
  const { data: userSession, status } = useSession();

  useEffect(() => {
    if (
      !isLocaleReady ||
      !user?.timeZone ||
      status !== "authenticated" ||
      userSession?.user?.impersonatedBy
    ) {
      return;
    }
    const cookie = document.cookie
      .split(";")
      .find((cookie) => cookie.trim().startsWith("calcom-timezone-dialog"));
    if (
      !cookie &&
      dayjs.tz(undefined, browserTimezone).utcOffset() !== dayjs.tz(undefined, user.timeZone).utcOffset()
    ) {
      setShowDialog(true);
    }
  }, [user, isLocaleReady, status, browserTimezone, userSession?.user?.impersonatedBy]);

  return { open: showDialog, setOpen: setShowDialog, browserTimezone };
}

export default function TimezoneChangeDialog() {
  const { open, setOpen, browserTimezone } = useOpenTimezoneDialog();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TimezoneChangeDialogContent browserTimezone={browserTimezone} onAction={() => setOpen(false)} />
    </Dialog>
  );
}
