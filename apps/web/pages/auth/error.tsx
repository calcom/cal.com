import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "@server/lib/auth/error/getStaticProps";
import { getStaticProps } from "@server/lib/auth/error/getStaticProps";

import Error from "~/auth/error/error-view";

const Page = (props: PageProps) => <Error {...props} />;
Page.PageWrapper = PageWrapper;
export default Page;
export { getStaticProps };
