import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as UserPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

const getEmbedData = withEmbedSsrAppDir<UserPageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
