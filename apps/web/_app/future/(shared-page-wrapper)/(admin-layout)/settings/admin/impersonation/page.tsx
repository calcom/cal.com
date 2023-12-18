import Page from "@pages/settings/admin/impersonation";
import { _generateMetadata } from "_app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("impersonation")
  );

export default Page;
