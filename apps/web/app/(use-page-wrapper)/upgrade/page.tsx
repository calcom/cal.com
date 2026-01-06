import { _generateMetadata } from "app/_utils";

import LegacyPage from "@calcom/web/modules/upgrade/upgrade-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("upgrade"),
    () => "",
    undefined,
    undefined,
    "/upgrade"
  );

const ServerPage = async () => {
  return <LegacyPage />;
};

export default ServerPage;
