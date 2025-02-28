import { _generateMetadata } from "app/_utils";

import CreateNewView from "~/settings/platform/oauth-clients/create-new-view";

export const generateMetadata = async ({params}: PageProps) => {
  return await _generateMetadata(
     t("oAuth_client_creation_form"),
    ""
  );
};

const ServerPageWrapper = () => {
  return <CreateNewView />;
};

export default ServerPageWrapper;
