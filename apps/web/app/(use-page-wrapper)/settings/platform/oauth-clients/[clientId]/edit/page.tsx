import { _generateMetadata } from "app/_utils";
import EditView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-view";

export const generateMetadata = async ({ params }: { params: Promise<{ clientId: string }> }) =>
  await _generateMetadata(
    (t) => t("oAuth_client_updation_form"),
    () => "",
    undefined,
    undefined,
    `/settings/platform/oauth-clients/${(await params).clientId}/edit`
  );

const ServerPageWrapper = () => {
  return <EditView />;
};

export default ServerPageWrapper;
