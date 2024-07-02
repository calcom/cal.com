import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/sso/page/teams-sso-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description")
  );

export default Page;
