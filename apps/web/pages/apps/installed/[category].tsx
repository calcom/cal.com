import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/installed/[category]/installed-category-view";
import InstalledApps from "~/apps/installed/[category]/installed-category-view";

const Page = (props: PageProps) => <InstalledApps {...props} />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/apps/installed/[category]/getServerSideProps";

export default Page;
