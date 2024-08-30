import PageWrapper from "@components/PageWrapper";

import User, { type PageProps } from "~/users/views/users-public-view";

export { getServerSideProps } from "~/users/views/users-public-view.getServerSideProps";

const UserPage = (props: PageProps) => <User {...props} />;

UserPage.PageWrapper = PageWrapper;

export default UserPage;
