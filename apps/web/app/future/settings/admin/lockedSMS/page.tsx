import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@components/auth/layouts/AdminLayoutAppDir";

import LegacyPage from "~/settings/admin/lockedSMS/lockedSMS-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "lockedSMS",
    () => "Lock or unlock SMS sending for users"
  );

export default WithLayout({
  Page: LegacyPage,
  getLayout,
})<"P">;
