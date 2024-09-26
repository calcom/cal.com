import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

import Setup from "~/auth/setup-view";
import type { PageProps } from "~/auth/setup-view";

export default WithLayout({
  getLayout: null,
  Page: Setup,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
