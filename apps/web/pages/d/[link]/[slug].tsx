import { getServerSideProps, type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import Type from "~/d/[link]/d-type-view";

const Page = (props: PageProps) => <Type {...props} />;
export { getServerSideProps };

Page.PageWrapper = PageWrapper;
export default Page;
