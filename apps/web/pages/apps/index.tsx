import { getServerSideProps } from "@lib/apps/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/apps-view";
import Apps, { LayoutWrapper } from "~/apps/apps-view";

const Page = (props: PageProps) => <Apps {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = LayoutWrapper;

export { getServerSideProps };

export default Page;
