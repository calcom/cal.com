import Page from "@pages/settings/security/impersonation";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("impersonation"),
    (t) => t("impersonation_description")
  );

export default Page;
