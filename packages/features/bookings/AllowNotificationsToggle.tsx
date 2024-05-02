import { useSession } from "next-auth/react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Switch, Skeleton, Label, showToast } from "@calcom/ui";

export default function AllowNotificationsToggle() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user } = trpc.viewer.me.useQuery();
  const { update } = useSession();
  const [isReceiveEventNotifcationsChecked, setIsReceiveEventNotifcationsChecked] = useState(
    !!user.notficationsAllowed
  );

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (res) => {
      await utils.viewer.me.invalidate();
      showToast(t("notifications_updated_successfully"), "success");
      await update(res);

      if (res.locale) {
        window.calNewLocale = res.locale;
      }
    },
    onError: () => {
      showToast(t("eerror_updating_notifications"), "error");
    },
  });

  async function handleChange(checked: boolean) {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications.");
      return;
    }
    if (checked) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        mutation.mutate({ notficationsAllowed: checked });
        setIsReceiveEventNotifcationsChecked(checked);
      }
    } else {
      mutation.mutate({ notficationsAllowed: checked });
      setIsReceiveEventNotifcationsChecked(checked);
    }
  }
  return (
    <div className="sm:hover:bg-muted hidden items-center rounded-md px-2 sm:flex">
      <Skeleton as={Label} htmlFor="allow-notifications" className="mt-2 cursor-pointer self-center pe-2">
        {t("allow_notifications")}
      </Skeleton>
      <Switch
        id="allow-notifications"
        disabled={mutation.isPending}
        checked={isReceiveEventNotifcationsChecked}
        onCheckedChange={(checked) => handleChange(checked)}
      />
    </div>
  );
}
