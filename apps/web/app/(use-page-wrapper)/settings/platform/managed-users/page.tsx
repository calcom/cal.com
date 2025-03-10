import { _generateMetadata } from "app/_utils";

import ManagedUsersView from "~/settings/platform/managed-users/managed-users-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description")
  );

const ServerPageWrapper = () => {
  return <ManagedUsersView />;
};

export default ServerPageWrapper;
