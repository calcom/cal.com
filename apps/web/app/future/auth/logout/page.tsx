import Logout from "@pages/auth/logout";
import { WithLayout } from "app/layoutHOC";

import { getFuturePageProps } from "@server/lib/getFuturePageProps";
import { getLogoutData } from "@server/lib/logoutGetData";

export default WithLayout({
  getLayout: null,
  Page: Logout,
  getData: (ctx) => getFuturePageProps(ctx, getLogoutData),
})<"P">;
