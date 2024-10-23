import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/auth/forgot-password/[id]/forgot-password-single-view";
import ForgotPassword from "~/auth/forgot-password/[id]/forgot-password-single-view";

const Page = (props: PageProps) => <ForgotPassword {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps } from "@server/lib/auth/forgot-password/[id]/getServerSideProps";
