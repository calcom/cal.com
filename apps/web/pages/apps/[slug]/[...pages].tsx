import { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/[slug]/[...pages]/pages-view";
import PagesView, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

const Page = (props: PageProps) => <PagesView {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export { getServerSideProps };

export default Page;
