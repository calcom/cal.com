"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { toastManager } from "@coss/ui/components/toast";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";

const ProfileImpersonationView = ({ user }: { user: RouterOutputs["viewer"]["me"]["get"] }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [disableImpersonation, setDisableImpersonation] = useState<boolean | undefined>(
    user?.disableImpersonation
  );

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("profile_updated_successfully"), type: "success" });
    },
    onSettled: () => {
      utils.viewer.me.invalidate();
    },
    onMutate: async ({ disableImpersonation }) => {
      await utils.viewer.me.get.cancel();
      const previousValue = utils.viewer.me.get.getData();

      setDisableImpersonation(disableImpersonation);

      return { previousValue };
    },
    onError: (error, variables, context) => {
      if (context?.previousValue) {
        utils.viewer.me.get.setData(undefined, context.previousValue);
        setDisableImpersonation(context.previousValue?.disableImpersonation);
      }
      toastManager.add({ title: `${t("error")}, ${error.message}`, type: "error" });
    },
  });

  return (
    <SettingsToggle
      title={t("user_impersonation_heading")}
      description={t("user_impersonation_description")}
      checked={!disableImpersonation}
      onCheckedChange={(checked) => {
        mutation.mutate({ disableImpersonation: !checked });
      }}
      disabled={mutation.isPending}
    />
  );
};

const ProfileImpersonationViewWrapper = () => {
  const { t } = useLocale();
  const { data: user, isPending } = trpc.viewer.me.get.useQuery();

  if (isPending || !user) {
    return (
      <SettingsToggle
        title={t("user_impersonation_heading")}
        description={t("user_impersonation_description")}
        loading
      />
    );
  }

  return <ProfileImpersonationView user={user} />;
};

export default ProfileImpersonationViewWrapper;
