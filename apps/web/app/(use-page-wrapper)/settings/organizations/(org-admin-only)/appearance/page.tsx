import { _generateMetadata } from "app/_utils";

import Page from "@calcom/web/modules/ee/organizations/appearance";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_org_description"),
    undefined,
    undefined,
    "/settings/organizations/appearance"
  );

const ServerPageWrapper = () => {
  return <Page />;
};

export default ServerPageWrapper;
