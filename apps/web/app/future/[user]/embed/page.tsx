import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import LegacyPage from "~/users/views/users-public-view";
import { getServerSideProps, type UserPageProps } from "~/users/views/users-public-view.getServerSideProps";

const getData = withAppDirSsr<UserPageProps>(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
