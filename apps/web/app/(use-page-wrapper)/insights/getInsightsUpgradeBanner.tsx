import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { FullscreenUpgradeBannerForInsightsPage } from "@calcom/web/modules/billing/upgrade-banners/FullscreenUpgradeBannerForInsightsPage";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import Shell from "~/shell/Shell";

export async function getInsightsUpgradeBanner(userId: number) {
  const membershipRepository = getMembershipRepository();
  const hasMembership = await membershipRepository.hasAnyAcceptedMembershipByUserId(userId);

  if (hasMembership) return null;

  return (
    <Shell withoutMain={true}>
      <ShellMainAppDir>
        <FullscreenUpgradeBannerForInsightsPage />
      </ShellMainAppDir>
    </Shell>
  );
}
