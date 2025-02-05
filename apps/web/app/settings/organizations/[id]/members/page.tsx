import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import MembersPage from "~/members/members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description")
  );

export default WithLayout({
  Page: MembersPage,
});
