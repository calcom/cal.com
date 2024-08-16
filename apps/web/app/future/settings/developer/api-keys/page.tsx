import { _generateMetadata } from "app/_utils";

import { APP_NAME } from "@calcom/lib/constants";

import Page from "~/settings/developer/api-keys-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_keys"),
    (t) => t("create_first_api_key_description", { appName: APP_NAME })
  );

export default Page;
