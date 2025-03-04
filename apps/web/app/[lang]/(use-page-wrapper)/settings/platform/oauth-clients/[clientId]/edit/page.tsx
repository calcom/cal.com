import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import EditView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("oAuth_client_updation_form"), "");
};

const ServerPageWrapper = () => {
  return <EditView />;
};

export default ServerPageWrapper;
