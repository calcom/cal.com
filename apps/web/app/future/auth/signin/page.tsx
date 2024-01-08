import Signin from "@pages/auth/signin";
import { WithLayout } from "app/layoutHOC";

import { getFuturePageProps } from "@server/lib/getFuturePageProps";
import { getSignInData } from "@server/lib/singInGetData";

export default WithLayout({
  getLayout: null,
  Page: Signin,
  // @ts-expect-error getData arg
  getData: (ctx) => getFuturePageProps(ctx, getSignInData),
})<"P">;
