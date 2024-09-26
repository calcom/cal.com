import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/categories/categories-view";
import Apps from "~/apps/categories/categories-view";

const Page = (props: PageProps) => <Apps {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps };
