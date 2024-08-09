import lockedSMSView from "@pages/settings/admin/lockedSMS/lockedSMSView";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@components/auth/layouts/AdminLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "lockedSMS",
    () => "Lock or unlock SMS sending for users"
  );

export default WithLayout({
  Page: lockedSMSView,
  getLayout,
})<"P">;
