import Page from "@pages/getting-started/[[...step]]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

export default WithLayout({ getLayout: null, getData: withAppDirSsr(getServerSideProps), Page });
