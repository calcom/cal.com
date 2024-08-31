import PageWrapper from "@components/PageWrapper";

import Error from "~/auth/error/error-view";

const Page = () => <Error />;
Page.PageWrapper = PageWrapper;
export default Page;
export { getStaticProps } from "@server/lib/auth/error/getStaticProps";
