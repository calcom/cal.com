import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { FullscreenUpgradeBannerForInsightsPage } from "@calcom/web/modules/billing/upgrade-banners/FullscreenUpgradeBannerForInsightsPage";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import Shell from "~/shell/Shell";

export async function getInsightsUpgradeBanner(userId: number) {
  const hasMembership = await PrismaMembershipRepository.hasAnyAcceptedMembershipByUserId(userId);

  if (hasMembership) return null;

  return (
    <Shell withoutMain={true}>
      <ShellMainAppDir>
        <FullscreenUpgradeBannerForInsightsPage />
      </ShellMainAppDir>
    </Shell>
  );
}
