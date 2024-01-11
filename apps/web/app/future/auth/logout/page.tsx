import Logout from "@pages/auth/logout";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/logout/getServerSideProps";

export default WithLayout({ getLayout: null, Page: Logout, getData: withAppDir(getServerSideProps) })<"P">;
