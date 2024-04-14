import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { IS_VISUAL_REGRESSION_TESTING } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogFooter, showToast } from "@calcom/ui";

export default function TimezoneChangeDialog() {
  const { t } = useLocale();
  const { data: user, isPending } = trpc.viewer.me.useQuery();
  const utils = trpc.useUtils();
  const userTz = user?.timeZone;
  const currentTz = dayjs.tz.guess() || "Europe/London";
  const formattedCurrentTz = currentTz?.replace("_", " ");

  // update user settings
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
    setOpen(false);
    mutation.mutate({
      timeZone: currentTz,
    });
  }

  // check for difference in user timezone and current browser timezone
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const tzDifferent =
      !isPending && dayjs.tz(undefined, currentTz).utcOffset() !== dayjs.tz(undefined, userTz).utcOffset();
    const showDialog = tzDifferent && !document.cookie.includes("calcom-timezone-dialog=1");
    setOpen(!IS_VISUAL_REGRESSION_TESTING && showDialog);
  }, [currentTz, isPending, userTz]);

  // save cookie to not show again
  function onCancel(maxAge: number, toast: boolean) {
    setOpen(false);
    document.cookie = `calcom-timezone-dialog=1;max-age=${maxAge}`;
    toast && showToast(t("we_wont_show_again"), "success");
  }

  const { data } = useSession();

  if (data?.user.impersonatedBy) return null;

  const ONE_DAY = 60 * 60 * 24; // 1 day in seconds (60 seconds * 60 minutes * 24 hours)
  const THREE_MONTHS = ONE_DAY * 90; // 90 days in seconds (90 days * 1 day in seconds)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title={t("update_timezone_question")}
        description={t("update_timezone_description", { formattedCurrentTz })}
        type="creation"
        onInteractOutside={() => onCancel(ONE_DAY, false) /* 1 day expire */}>
        {/* todo: save this in db and auto-update when timezone changes (be able to disable??? if yes, /settings)
        <Checkbox description="Always update timezone" />
        */}
        <div className="mb-8" />
        <DialogFooter showDivider>
          <DialogClose onClick={() => onCancel(THREE_MONTHS, true)} color="secondary">
            {t("dont_update")}
          </DialogClose>
          <DialogClose onClick={() => updateTimezone()} color="primary">
            {t("update_timezone")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
