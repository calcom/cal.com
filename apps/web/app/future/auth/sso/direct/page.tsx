import DirectSSOLogin from "@pages/auth/sso/direct";
import { WithLayout } from "app/layoutHOC";

import { getFuturePageProps } from "@server/lib/getFuturePageProps";
import { getSSODirectData } from "@server/lib/ssoDirectGetData";

export default WithLayout({
  getLayout: null,
  Page: DirectSSOLogin,
  getData: (ctx) => getFuturePageProps(ctx, getSSODirectData),
})<"P">;
