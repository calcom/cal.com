import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/teams/teams-view";
import Teams from "~/teams/teams-view";

export { getServerSideProps } from "@lib/teams/getServerSideProps";

const Page = (props: PageProps) => <Teams {...props} />;
Page.PageWrapper = PageWrapper;
export default Page;
