import Page from "@pages/settings/security/two-factor-auth";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("two_factor_auth"),
    (t) => t("add_an_extra_layer_of_security")
  );

export default Page;
