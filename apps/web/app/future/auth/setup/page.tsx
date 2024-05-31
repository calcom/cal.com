import Setup from "@pages/auth/setup";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";
import type { InferGetServerSidePropsType } from "next";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: Setup,
  getData: withAppDirSsr<InferGetServerSidePropsType<typeof getServerSideProps>>(getServerSideProps),
})<"P">;
