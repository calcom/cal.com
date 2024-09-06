import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import { getServerSideProps as _getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import User, { type PageProps } from "~/users/views/users-public-view";

const UserPage = (props: PageProps) => <User {...props} />;

UserPage.PageWrapper = PageWrapper;

export default UserPage;

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
