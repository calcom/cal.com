import PageWrapper from "@components/PageWrapper";

import TeamPage, { type PageProps } from "~/team/team-view";

const Page = (props: PageProps) => <TeamPage {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";
