import PageWrapper from "@components/PageWrapper";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

import type { PageProps } from "~/auth/signin-view";
import SignIn from "~/auth/signin-view";

const Page = (props: PageProps) => <SignIn {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps };
