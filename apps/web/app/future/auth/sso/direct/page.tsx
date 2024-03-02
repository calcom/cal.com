import DirectSSOLogin from "@pages/auth/sso/direct";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: DirectSSOLogin,
  getData: withAppDirSsr(getServerSideProps),
})<"P">;
