import { _generateMetadata } from "app/_utils";

import { UpgradeToOrganizations } from "@components/UpgradePageWrapper";

export default function OrganizationsPage() {
  return <UpgradeToOrganizations />;
}

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_org"),
    (t) => t("create_your_org_description")
  );
