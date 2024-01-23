import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import Page from "@components/pages/getting-started/[[...step]]";

export default WithLayout({ getLayout: null, getData: withAppDirSsr(getServerSideProps), Page });
