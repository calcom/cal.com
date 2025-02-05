import { _generateMetadata } from "app/_utils";

import LegacyPage from "~/connect-and-join/connect-and-join-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("connect_and_join"),
    () => ""
  );
};

export default LegacyPage;
