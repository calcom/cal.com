import Provider from "@pages/auth/sso/[provider]";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: Provider,
  getData: withAppDir(getServerSideProps),
})<"P">;
