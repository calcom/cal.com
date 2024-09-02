import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import type { PageProps } from "~/getting-started/[[...step]]/onboarding-view";
import Page from "~/getting-started/[[...step]]/onboarding-view";

export default WithLayout({ getLayout: null, getData: withAppDirSsr<PageProps>(getServerSideProps), Page });
