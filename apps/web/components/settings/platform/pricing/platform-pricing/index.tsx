import { useRouter } from "next/navigation";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { showToast } from "@calcom/ui";

import { useSubscribeTeamToStripe } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import { platformPlans } from "@components/settings/platform/platformUtils";
import { PlatformBillingCard } from "@components/settings/platform/pricing/billing-card";

type PlatformPricingProps = { teamId?: number | null };

export const PlatformPricing = ({ teamId }: PlatformPricingProps) => {
  const router = useRouter();
  const { mutateAsync, isPending } = useSubscribeTeamToStripe({
    onSuccess: (redirectUrl: string) => {
      router.push(redirectUrl);
    },
    onError: () => {
      showToast(ErrorCode.UnableToSubscribeToThePlatform, "error");
    },
    teamId,
  });

  return (
    <div className="flex h-auto flex-col items-center justify-center px-5 py-5 md:px-10 md:py-0 lg:h-[100vh]">
      <div className="mb-5 text-center text-2xl font-semibold">
        <h1>Subscribe to Platform</h1>
      </div>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {platformPlans.map((plan) => {
            return (
              <div key={plan.plan}>
                <PlatformBillingCard
                  plan={plan.plan}
                  description={plan.description}
                  pricing={plan.pricing}
                  includes={plan.includes}
                  isLoading={isPending}
                  handleSubscribe={() => {
                    !!teamId &&
                      (plan.plan === "Enterprise"
                        ? router.push("https://i.cal.com/sales/exploration")
                        : mutateAsync({ plan: plan.plan.toLocaleUpperCase() }));
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
