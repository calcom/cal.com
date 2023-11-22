import Page from "@pages/settings/teams/[id]/sso";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description")
  );

export default Page;
