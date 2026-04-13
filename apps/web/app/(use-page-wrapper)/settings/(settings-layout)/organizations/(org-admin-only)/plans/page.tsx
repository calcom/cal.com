import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { MembershipRole } from "@calcom/prisma/enums";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { _generateMetadata, getTranslate } from "app/_utils";
import PlansView from "~/settings/billing/plans/plans-view";
import { validateUserHasOrgPerms } from "../../actions/validateUserHasOrgPerms";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("plans"),
    (t) => t("plans_page_description"),
    undefined,
    undefined,
    "/settings/organizations/plans"
  );

const Page = async () => {
  const t = await getTranslate();

  const session = await validateUserHasOrgPerms({
    permission: "organization.manageBilling",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  const orgId = session.user.org.id;

  let initialBillingPeriod: "MONTHLY" | "ANNUALLY" | null = null;
  let subscriptionEnd: string | null = null;
  try {
    const billingPeriodService = new BillingPeriodService();
    const info = await billingPeriodService.getBillingPeriodInfo(orgId);
    initialBillingPeriod = info.billingPeriod;
    subscriptionEnd = info.subscriptionEnd?.toISOString() ?? null;
  } catch {
    // Billing info not available — client will fetch
  }

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("plans")}>
          <AppHeaderDescription>{t("plans_page_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <PlansView
        context="organization"
        teamId={orgId}
        initialBillingPeriod={initialBillingPeriod}
        subscriptionEnd={subscriptionEnd}
      />
    </>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
