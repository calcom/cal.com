import Page from "@pages/settings/billing/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("team_billing_description")
  );

export default Page;
