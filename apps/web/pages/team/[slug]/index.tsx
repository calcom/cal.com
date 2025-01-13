import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";

export { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

const Page = (props: PageProps) => <TeamPage {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;
