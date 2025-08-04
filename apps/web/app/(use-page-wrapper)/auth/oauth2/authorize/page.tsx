import { _generateMetadata } from "app/_utils";

import Page from "~/auth/oauth2/authorize-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("authorize"),
    () => "",
    undefined,
    undefined,
    "/auth/oauth2/authorize"
  );
};

const ServerPageWrapper = async () => {
  return <Page />;
};

export default ServerPageWrapper;
