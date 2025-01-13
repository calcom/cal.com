import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/users/views/users-public-view";
import User from "~/users/views/users-public-view";

export { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

const UserPage = (props: PageProps) => <User {...props} />;

UserPage.PageWrapper = PageWrapper;

export default UserPage;
