import { getStaticProps } from "@lib/routing/getStaticProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/[slug]/slug-view";
import SingleAppPage from "~/apps/[slug]/slug-view";

const Page = (props: PageProps) => <SingleAppPage {...props} />;

export { getStaticProps };

Page.PageWrapper = PageWrapper;

export default Page;
