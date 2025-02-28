import { _generateMetadata } from "app/_utils";

import MembersPage from "~/members/members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description")
  );

const ServerPageWrapper = () => {
  return <MembersPage />;
};

export default ServerPageWrapper;
