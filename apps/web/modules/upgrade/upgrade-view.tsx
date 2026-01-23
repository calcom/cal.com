"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

import Shell from "~/shell/Shell";

export type OrgUpgradeBannerProps = {
  data: RouterOutputs["viewer"]["me"]["getUserTopBanners"]["orgUpgradeBanner"];
};

export default function UpgradePage() {
  const { t } = useLocale();

  const router = useRouter();
  const publishOrgMutation = trpc.viewer.organizations.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const doesUserHaveOrgToUpgrade = trpc.viewer.organizations.checkIfOrgNeedsUpgrade.useQuery();

  return (
    <Shell>
      <div className="max-w-(--breakpoint-lg)">
        {doesUserHaveOrgToUpgrade.data ? (
          <EmptyScreen
            headline={t("your_upgrade_is_here")}
            description={t("your_upgrade_is_here_description")}
            Icon="circle-arrow-up"
            buttonRaw={
              <Button
                onClick={() => {
                  publishOrgMutation.mutate();
                }}>
                {t("upgrade")}
              </Button>
            }
          />
        ) : (
          <EmptyScreen
            headline={t("you_are_all_set")}
            description={t("you_are_all_set_description")}
            Icon="circle-check"
            buttonRaw={<Button href="mailto:support@cal.com">{t("contact_support")}</Button>}
          />
        )}
      </div>
    </Shell>
  );
}
