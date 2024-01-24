import VerifyPage from "@pages/auth/verify";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: VerifyPage,
  getData: withAppDirSsr(getServerSideProps),
})<"P">;
