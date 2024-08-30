import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import User, { type PageProps } from "~/users/views/users-public-view";
import { getServerSideProps as _getServerSideProps } from "~/users/views/users-public-view.getServerSideProps";

const UserPage = (props: PageProps) => <User {...props} />;

UserPage.PageWrapper = PageWrapper;

export default UserPage;

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
