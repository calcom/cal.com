import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import Provider from "@components/pages/auth/sso/[provider]";

import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({
  getLayout: null,
  Page: Provider,
  getData,
})<"P">;
