import Page from "@calcom/features/ee/organizations/pages/settings/appearance";
import { _generateMetadata } from "app/_utils";

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
