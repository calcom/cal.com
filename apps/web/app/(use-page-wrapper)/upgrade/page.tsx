import { _generateMetadata } from "app/_utils";

import UpgradePage from "~/upgrade/upgrade-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("upgrade"),
    () => ""
  );

const ServerPage = async () => {
  return <UpgradePage />;
};

export default ServerPage;
