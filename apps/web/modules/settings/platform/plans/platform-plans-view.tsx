"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing";
import Shell from "~/shell/Shell";

export default function PlatformPlans() {
  const { t } = useLocale();
  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, isPaidUser, userBillingData, userOrgId } =
    useGetUserAttributes();

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <div className="m-5">{t("loading")}</div>;
  }

  if (!isPlatformUser) return <NoPlatformPlan />;

  return (
    <div>
      <Shell
        backPath
        isPlatformUser={true}
        heading={
          <h1 className="mx-2 mt-4 text-center text-xl md:text-2xl">
            {t("currently_subscribed_to_plan", {
              planFirstLetter: userBillingData?.plan[0],
              planRest: userBillingData?.plan.slice(1).toLocaleLowerCase(),
            })}
          </h1>
        }
        withoutMain={false}
        SidebarContainer={<></>}>
        <PlatformPricing teamId={userOrgId} teamPlan={userBillingData?.plan.toLocaleLowerCase()} />
      </Shell>
    </div>
  );
}
