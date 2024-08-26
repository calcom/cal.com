import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

import PagesView, { getLayout, getServerSideProps } from "~/apps/[slug]/[...pages]/pages-view";

const Page = (props: inferSSRProps<typeof getServerSideProps>) => <PagesView {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export { getServerSideProps };

export default Page;
