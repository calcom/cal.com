import VerifyPage from "@pages/auth/verify";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/verify/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: VerifyPage,
  getData: withAppDir(getServerSideProps),
})<"P">;
