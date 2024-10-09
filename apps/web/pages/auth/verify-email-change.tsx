import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/auth/verify-email-change-view";
import VerifyEmailChange from "~/auth/verify-email-change-view";

const Page = (props: PageProps) => <VerifyEmailChange {...props} />;
Page.PageWrapper = PageWrapper;
export default Page;
export { getServerSideProps } from "@server/lib/auth/verify-email-change/getServerSideProps";
