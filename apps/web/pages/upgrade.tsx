"use client";

import { useRouter } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen } from "@calcom/ui";
import { showToast } from "@calcom/ui";
import { ArrowUpCircle, CheckCircle } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export type OrgUpgradeBannerProps = {
  data: RouterOutputs["viewer"]["getUserTopBanners"]["orgUpgradeBanner"];
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

  /* TODO: figure out how data works 
  if (!data) return null;

  const [membership] = data;
  if (!membership) return null; */

  const membership = false;

  return (
    <Shell hideHeadingOnMobile>
      <div className="max-w-screen-lg">
        {membership ? (
          <EmptyScreen
            headline="You are all set"
            description="You are already on the latest plan. Nothing to upgrade. Enjoy the new features and reach out to us with any questions!"
            Icon={CheckCircle}
            buttonRaw={<Button href="mailto:support@cal.com">{t("contact_support")}</Button>}
          />
        ) : (
          <EmptyScreen
            headline="Your upgrade is here"
            description="Improve your scheduling experience by upgrading to the new plan and enjoy the new features."
            Icon={ArrowUpCircle}
            buttonRaw={
              <Button
                onClick={() => {
                  publishOrgMutation.mutate();
                }}>
                {t("upgrade")}
              </Button>
            }
          />
        )}
      </div>
    </Shell>
  );
}
UpgradePage.PageWrapper = PageWrapper;
