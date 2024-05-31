import Logout from "@pages/auth/logout";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/logout/getServerSideProps";

export default WithLayout({ getLayout: null, Page: Logout, getData: withAppDirSsr(getServerSideProps) })<"P">;
