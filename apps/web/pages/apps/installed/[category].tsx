import PageWrapper from "@components/PageWrapper";

import InstalledApps from "~/apps/installed/[category]/installed-category-view";

const Page = () => <InstalledApps />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/apps/installed/[category]/getServerSideProps";

export default Page;
