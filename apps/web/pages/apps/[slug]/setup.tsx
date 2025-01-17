import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/[slug]/setup/setup-view";
import SetupView from "~/apps/[slug]/setup/setup-view";

const Page = (props: PageProps) => <SetupView {...props} />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps };

export default Page;
