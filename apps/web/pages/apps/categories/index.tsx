import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import Apps from "~/apps/categories/categories-view";

const Page = (props: inferSSRProps<typeof getServerSideProps>) => <Apps {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps };
