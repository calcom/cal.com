import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import ManagedUsersView from "~/settings/platform/managed-users/managed-users-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description")
  );

export default WithLayout({
  Page: ManagedUsersView,
});
