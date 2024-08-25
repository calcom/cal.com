import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "@lib/apps/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import Apps, { LayoutWrapper } from "~/apps/apps-view";

const Page = (props: Omit<inferSSRProps<typeof getServerSideProps>, "trpcState">) => <Apps {...props} />;

Page.PageWrapper = PageWrapper;
Page.getLayout = LayoutWrapper;

export { getServerSideProps };

export default Page;
