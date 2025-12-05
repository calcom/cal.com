"use client";

import Shell from "@calcom/features/shell/Shell";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { PlatformPricing } from "@calcom/web/components/settings/platform/pricing/platform-pricing/index";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
  }
}

type WebhooksByViewer = RouterOutputs["viewer"]["webhook"]["getByViewer"];

type Props = {
  data: WebhooksByViewer;
};

export default function Webhooks({ data }: Props) {
  const { t } = useLocale();
  const { isPlatformUser, isPaidUser, userOrgId, isUserLoading, isUserBillingDataLoading, userBillingData } =
    useGetUserAttributes();

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <div className="m-5">{t("loading")}</div>;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>{t("subscribe_to_platform")}</h1>
          </div>
        }
      />
    );

  if (!isPlatformUser)
    return (
      <div>
        <Shell isPlatformUser={true} withoutMain={false} SidebarContainer={<></>}>
          <NoPlatformPlan />
        </Shell>
      </div>
    );

  return (
    <div>
      <Shell withoutMain={false} isPlatformUser={true}>
        <WebhooksView data={data} />
      </Shell>
    </div>
  );
}
