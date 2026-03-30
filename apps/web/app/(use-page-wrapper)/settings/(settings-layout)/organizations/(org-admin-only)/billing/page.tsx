import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import { MembershipRole } from "@calcom/prisma/enums";

import BillingView from "~/settings/billing/billing-view";

import { validateUserHasOrgPerms } from "../../actions/validateUserHasOrgPerms";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description"),
    undefined,
    undefined,
    "/settings/organizations/billing"
  );

const Page = async () => {
  const t = await getTranslate();

  await validateUserHasOrgPerms({
    permission: "organization.manageBilling",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("billing")}>
          <AppHeaderDescription>{t("manage_billing_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <BillingView />
    </div>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
