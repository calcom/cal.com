import type { PageProps } from "@lib/routing/[pages]/getServerSideProps";
import { getServerSideProps } from "@lib/routing/[pages]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import PagesView, { getLayout } from "~/routing/pages-view";

const Page = (props: PageProps) => <PagesView {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export { getServerSideProps };

export default Page;
