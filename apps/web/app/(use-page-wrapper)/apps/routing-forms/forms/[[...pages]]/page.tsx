import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { FullscreenUpgradeBannerForRoutingFormPage } from "@calcom/web/modules/billing/upgrade-banners/FullscreenUpgradeBannerForRoutingFormPage";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import Forms from "./Forms";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const pages = (await params).pages;

  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    `/routing/forms/${pages?.length > 0 ? pages.join("/") : ""}`
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const hasTeamPlan = userId && (await MembershipRepository.hasAnyAcceptedMembershipByUserId(userId));

  if (!hasTeamPlan) {
    return <FullscreenUpgradeBannerForRoutingFormPage />;
  }

  return <Forms appUrl="/routing" />;
};

export default ServerPage;
