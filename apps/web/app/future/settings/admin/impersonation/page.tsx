import { _generateMetadata } from "app/_utils";

import ImpersonationView from "~/settings/admin/impersonation/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("impersonation")
  );

export default ImpersonationView;
