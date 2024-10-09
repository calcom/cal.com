import PageWrapper from "@components/PageWrapper";

import { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";

import type { SSODirectPageProps } from "~/auth/sso/direct-view";
import SSODirectView from "~/auth/sso/direct-view";

const Page = (props: SSODirectPageProps) => <SSODirectView {...props} />;

Page.PageWrapper = PageWrapper;
export default Page;
export { getServerSideProps };
