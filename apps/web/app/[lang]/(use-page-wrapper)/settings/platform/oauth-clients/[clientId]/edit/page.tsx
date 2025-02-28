import { _generateMetadata } from "app/_utils";

import EditView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oAuth_client_updation_form"),
    () => ""
  );

const ServerPageWrapper = () => {
  return <EditView />;
};

export default ServerPageWrapper;
