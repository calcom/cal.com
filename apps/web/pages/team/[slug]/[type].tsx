import PageWrapper from "@components/PageWrapper";

import TypePage, { type PageProps } from "~/team/type-view";

const Page = (props: PageProps) => <TypePage {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
