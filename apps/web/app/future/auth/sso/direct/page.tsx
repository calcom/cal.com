import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";

import type { SSODirectPageProps } from "~/auth/sso/direct-view";
import SSODirectView from "~/auth/sso/direct-view";

export default WithLayout({
  getLayout: null,
  Page: SSODirectView,
  getData: withAppDirSsr<SSODirectPageProps>(getServerSideProps),
})<"P">;
