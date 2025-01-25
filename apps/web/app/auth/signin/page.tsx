import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

import SignIn from "~/auth/signin-view";
import type { PageProps } from "~/auth/signin-view";

export default WithLayout({
  getLayout: null,
  Page: SignIn,
  // @ts-expect-error TODO: fix this
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
