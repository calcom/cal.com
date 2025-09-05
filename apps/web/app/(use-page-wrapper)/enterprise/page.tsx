import EnterprisePage from "@components/EnterprisePage";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_org"),
    (t) => t("create_your_org_description"),
    undefined,
    undefined,
    "/enterprise"
  );

const ServerPageWrapper = async () => {
  return <EnterprisePage />;
};

export default ServerPageWrapper;
