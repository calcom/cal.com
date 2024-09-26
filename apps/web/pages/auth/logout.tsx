import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/auth/logout-view";
import Logout from "~/auth/logout-view";

const Page = (props: PageProps) => <Logout {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps } from "@server/lib/auth/logout/getServerSideProps";
