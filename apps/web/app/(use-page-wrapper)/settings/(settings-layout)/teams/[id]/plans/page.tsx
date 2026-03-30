import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { prisma } from "@calcom/prisma";
import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";
import PlansView from "~/settings/billing/plans/plans-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("plans"),
    (t) => t("plans_page_description"),
    undefined,
    undefined,
    "/settings/teams/plans"
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const t = await getTranslate();
  const teamId = Number(id);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { parentId: true },
  });

  if (team?.parentId) {
    redirect(`/settings/teams/${teamId}/billing`);
  }

  let initialBillingPeriod: "MONTHLY" | "ANNUALLY" | null = null;
  let subscriptionEnd: string | null = null;
  try {
    const billingPeriodService = new BillingPeriodService();
    const info = await billingPeriodService.getBillingPeriodInfo(teamId);
    initialBillingPeriod = info.billingPeriod;
    subscriptionEnd = info.subscriptionEnd?.toISOString() ?? null;
  } catch {
    // Billing info not available — client will fetch
  }

  return (
    <SettingsHeader title={t("plans")} description={t("plans_page_description")}>
      <PlansView context="team" teamId={teamId} initialBillingPeriod={initialBillingPeriod} subscriptionEnd={subscriptionEnd} />
    </SettingsHeader>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
