import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import PagesView, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

const Page = (props: inferSSRProps<typeof getServerSideProps>) => <PagesView {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export { getServerSideProps };

export default Page;
