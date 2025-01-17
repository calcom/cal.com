import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";
import Type from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";

const Page = (props: PageProps) => <Type {...props} />;
Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";
export default Page;
