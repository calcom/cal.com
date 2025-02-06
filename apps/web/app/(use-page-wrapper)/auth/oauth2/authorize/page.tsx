import { _generateMetadata } from "app/_utils";

import Page from "~/auth/oauth2/authorize-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("authorize"),
    () => ""
  );
};

export default Page;
