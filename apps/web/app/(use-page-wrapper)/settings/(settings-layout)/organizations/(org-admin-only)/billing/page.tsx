import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import BillingView from "~/settings/billing/billing-view";

<<<<<<< HEAD
import { validateUserHasOrgPerms } from "../../_actions/validateUserHasOrgPerms";
=======
import { validateUserHasOrgAdmin } from "../../actions/validateUserHasOrgAdmin";
>>>>>>> main

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
<<<<<<< HEAD

  await validateUserHasOrgPerms({
    permission: "organization.manageBilling",
    fallbackRoles: ["OWNER"],
  });
=======
  await validateUserHasOrgAdmin();

  // TODO(SEAN): Add PBAC to this page in the next PR
>>>>>>> main

  return (
    <SettingsHeader
      title={t("billing")}
      description={t("manage_billing_description")}
      borderInShellHeader={true}>
      <BillingView />
    </SettingsHeader>
  );
};

export default Page;
