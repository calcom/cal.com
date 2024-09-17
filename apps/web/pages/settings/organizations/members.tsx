import MembersView from "@calcom/features/ee/organizations/pages/settings/members";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

export {
  getServerSidePropsForMembers as getServerSideProps,
  type PageProps,
} from "@calcom/features/ee/organizations/pages/settings/getServerSidePropsMembers";

const Page = MembersView as unknown as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
