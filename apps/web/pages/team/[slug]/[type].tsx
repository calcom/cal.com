import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/team/type-view";
import TypePage from "~/team/type-view";

export { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

const Page = (props: PageProps) => <TypePage {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;
