import { _generateMetadata } from "app/_utils";

import Page from "~/settings/security/password-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description")
  );

export default Page;
