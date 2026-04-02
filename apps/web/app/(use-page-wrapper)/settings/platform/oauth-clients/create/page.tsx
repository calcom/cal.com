import { _generateMetadata } from "app/_utils";
import CreateNewView from "~/settings/platform/oauth-clients/create-new-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("oAuth_client_creation_form"),
    () => "",
    undefined,
    undefined,
    "/settings/platform/oauth-clients/create"
  );
};

const ServerPageWrapper = () => {
  return <CreateNewView />;
};

export default ServerPageWrapper;
