"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { TopBanner } from "@calcom/ui/components/top-banner";

export type OrgJoinBannerProps = {
  data: RouterOutputs["viewer"]["me"]["getUserTopBanners"]["orgJoinBanner"];
};

export function OrgJoinBanner({ data }: OrgJoinBannerProps) {
  const { t } = useLocale();

  const requestOrgMembershipMutation = trpc.viewer.organizations.requestOrgMembership.useMutation({
    onSuccess: () => {
      showToast(t("org_join_request_toast_success"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (!data) return null;

  return (
    <TopBanner
      text={t("org_join_banner_description", { domain: data.domain })}
      variant="default"
      actions={
        <button
          className="border-b border-b-black"
          disabled={requestOrgMembershipMutation.isPending}
          onClick={() => {
            requestOrgMembershipMutation.mutate({ orgId: data.orgId });
          }}>
          {t("org_join_banner_cta")}
        </button>
      }
    />
  );
}

export default OrgJoinBanner;
