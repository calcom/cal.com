import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description")
  );

export default WithLayout({
  Page: PlatformMembersView,
});
