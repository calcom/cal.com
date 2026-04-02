"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { SettingsToggle } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle stack-y-6 border border-t-0 px-4 py-8 sm:px-6">
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const ProfileImpersonationView = ({ user }: { user: RouterOutputs["viewer"]["me"]["get"] }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [disableImpersonation, setDisableImpersonation] = useState<boolean | undefined>(
    user?.disableImpersonation
  );

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("profile_updated_successfully"), "success");
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
      showToast(`${t("error")}, ${error.message}`, "error");
    },
  });

  return (
    <>
      <div>
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={t("user_impersonation_heading")}
          description={t("user_impersonation_description")}
          checked={!disableImpersonation}
          onCheckedChange={(checked) => {
            mutation.mutate({ disableImpersonation: !checked });
          }}
          switchContainerClassName="rounded-t-none border-t-0"
          disabled={mutation.isPending}
        />
      </div>
    </>
  );
};

const ProfileImpersonationViewWrapper = () => {
  const { data: user, isPending } = trpc.viewer.me.get.useQuery();
  if (isPending || !user) return <SkeletonLoader />;

  return <ProfileImpersonationView user={user} />;
};

export default ProfileImpersonationViewWrapper;
