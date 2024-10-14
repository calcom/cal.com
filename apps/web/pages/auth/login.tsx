import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/auth/login-view";
import Login from "~/auth/login-view";

const Page = (props: PageProps) => <Login {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";
