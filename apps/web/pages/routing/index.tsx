import type { PageProps } from "@lib/routing/getServerSideProps";
import { getServerSideProps } from "@lib/routing/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import PagesView, { getLayout } from "~/routing/pages-view";

const Page = (props: PageProps) => <PagesView {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export { getServerSideProps };

export default Page;
