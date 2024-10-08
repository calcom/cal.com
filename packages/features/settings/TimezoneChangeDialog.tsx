"use client";

import type { ManipulateType as DayjsManipulateType } from "dayjs";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";

function hideDialogFor(hideFor: [number, DayjsManipulateType], toastContent: string) {
  document.cookie = `calcom-timezone-dialog=1;max-age=${
    dayjs().add(hideFor[0], hideFor[1]).unix() - dayjs().unix()
  }`;
  if (toastContent) showToast(toastContent, "success");
}

const TimezoneChangeDialogContent = () => {
  const { t, isLocaleReady } = useLocale();
  if (!isLocaleReady) return null;

  const utils = trpc.useUtils();

  const browserTimezone = dayjs.tz.guess() || "Europe/London";
  const formattedCurrentTz = browserTimezone.replace("_", " ");

  const onMutationSuccess = async () => {
    showToast(t("updated_timezone_to", { formattedCurrentTz }), "success");
    await utils.viewer.me.invalidate();
  };

  const onMutationError = () => {
    showToast(t("couldnt_update_timezone"), "error");
  };

  // update timezone in db
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  });

  const updateTimezone = () => {
    mutation.mutate({
      timeZone: browserTimezone,
    });
  };

  return (
    <>
      <DialogHeader
        title={t("update_timezone_question")}
        subtitle={t("update_timezone_description", { formattedCurrentTz })}
      />
      {/* todo: save this in db and auto-update when timezone changes (be able to disable??? if yes, /settings)
        <Checkbox description="Always update timezone" />
        */}
      <div className="mb-8" />
      <DialogFooter showDivider>
        <DialogClose onClick={() => hideDialogFor([3, "months"], t("we_wont_show_again"))} color="secondary">
          {t("dont_update")}
        </DialogClose>
        <DialogClose onClick={() => updateTimezone()} color="primary">
          {t("update_timezone")}
        </DialogClose>
      </DialogFooter>
    </>
  );
};

export function useOpenTimezoneDialog() {
  const { data: user } = trpc.viewer.me.useQuery();
  const [showDialog, setShowDialog] = useState(false);
  const { data: userSession, status } = useSession();

  useEffect(() => {
    if (!user?.timeZone || status !== "authenticated" || userSession?.user?.impersonatedBy) {
      return;
    }
    const browserTimezone = dayjs.tz.guess() || "Europe/London";
    if (dayjs.tz(undefined, browserTimezone).utcOffset() !== dayjs.tz(undefined, user.timeZone).utcOffset()) {
      setShowDialog(true);
    }
  }, [user?.timeZone, status, userSession?.user?.impersonatedBy]);

  return { open: showDialog, setOpen: setShowDialog };
}

function TimezoneChangeDialogContainer() {
  const { open, setOpen } = useOpenTimezoneDialog();
  const { t } = useLocale();

  const handleInteractOutside = () => {
    hideDialogFor([1, "day"], t("we_wont_show_again"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Dismiss dialog for a day on outside interaction */}
      <DialogContent type="creation" onInteractOutside={handleInteractOutside}>
        <TimezoneChangeDialogContent />
      </DialogContent>
    </Dialog>
  );
}

export default function TimezoneChangeDialog() {
  const [renderDialog, setRenderDialog] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && document) {
      const cookie = document.cookie
        .split(";")
        .find((cookie) => cookie.trim().startsWith("calcom-timezone-dialog"));
      if (!cookie) {
        setRenderDialog(true);
      }
    }
  }, []);
  // bail if the cookie exists or window/document is not available
  if (!renderDialog) {
    return null;
  }
  return <TimezoneChangeDialogContainer />;
}
