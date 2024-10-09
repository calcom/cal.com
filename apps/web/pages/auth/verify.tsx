import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/auth/verify-view";
import Verify from "~/auth/verify-view";

const Page = (props: PageProps) => <Verify {...props} />;
Page.PageWrapper = PageWrapper;
export default Page;
export { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";
