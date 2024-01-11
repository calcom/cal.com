import signin from "@pages/auth/signin";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

export default WithLayout({ getLayout: null, Page: signin, getData: withAppDir(getServerSideProps) })<"P">;
