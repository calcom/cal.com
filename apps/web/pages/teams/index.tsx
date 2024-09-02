import PageWrapper from "@components/PageWrapper";

import Teams from "~/teams/teams-view";

export { getServerSideProps } from "@lib/teams/getServerSideProps";

const Page = () => <Teams />;
Page.PageWrapper = PageWrapper;
export default Page;
