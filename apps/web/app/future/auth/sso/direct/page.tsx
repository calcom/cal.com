import DirectSSOLogin from "@pages/auth/sso/direct";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: DirectSSOLogin,
  getData: withAppDir(getServerSideProps),
})<"P">;
