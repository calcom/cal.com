import { _generateMetadata } from "app/_utils";

import UpgradeToEnterprise from "@components/UpgradePageWrapper";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("enterprise_description"),
    (t) => t("create_your_org_description")
  );

export default UpgradeToEnterprise;
