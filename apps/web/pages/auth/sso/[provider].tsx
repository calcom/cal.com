import PageWrapper from "@components/PageWrapper";

import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

import type { SSOProviderPageProps } from "~/auth/sso/provider-view";
import SSOProviderView from "~/auth/sso/provider-view";

const Page = (props: SSOProviderPageProps) => <SSOProviderView {...props} />;

Page.PageWrapper = PageWrapper;
export default Page;
export { getServerSideProps };
