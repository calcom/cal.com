import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

import type { SSOProviderPageProps } from "~/auth/sso/provider-view";
import SSOProviderView from "~/auth/sso/provider-view";

export default WithLayout({
  getLayout: null,
  Page: SSOProviderView,
  getData: withAppDirSsr<SSOProviderPageProps>(getServerSideProps),
})<"P">;
