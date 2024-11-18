import { getServerSideProps } from "@lib/apps/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/apps-view";
import Apps from "~/apps/apps-view";

const Page = (props: PageProps) => <Apps {...props} />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps };

export default Page;
