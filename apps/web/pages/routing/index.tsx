import { getServerSideProps } from "@lib/routing/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/routing/pages-view";
import PagesView, { GetFormLayout as getLayout } from "~/routing/pages-view";

const Page = (props: PageProps) => <PagesView {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export { getServerSideProps };

export default Page;
