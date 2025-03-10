import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import CreateNewView from "~/settings/platform/oauth-clients/create-new-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("oAuth_client_creation_form"), "");
};

const ServerPageWrapper = () => {
  return <CreateNewView />;
};

export default ServerPageWrapper;
