import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import signin from "@components/pages/auth/signin";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({
  getLayout: null,
  Page: signin,
  getData,
})<"P">;
