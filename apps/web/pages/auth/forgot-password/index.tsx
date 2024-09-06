import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/auth/forgot-password/forgot-password-view";
import ForgotPassword from "~/auth/forgot-password/forgot-password-view";

const Page = (props: PageProps) => <ForgotPassword {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps } from "@server/lib/auth/forgot-password/getServerSideProps";
