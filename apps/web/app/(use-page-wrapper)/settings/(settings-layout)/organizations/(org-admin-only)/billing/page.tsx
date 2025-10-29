import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
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
    <SettingsHeader
      title={t("billing")}
      description={t("manage_billing_description")}
      borderInShellHeader={false}>
      <BillingView />
    </SettingsHeader>
  );
};

export default Page;
