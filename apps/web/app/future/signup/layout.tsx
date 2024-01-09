import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/signupGetData";

export default WithLayout({ getLayout: null, getData: withAppDir(getServerSideProps) })<"L">;
