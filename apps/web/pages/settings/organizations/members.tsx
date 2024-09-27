import MembersView from "@calcom/features/ee/organizations/pages/settings/members";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

export {
  getServerSidePropsForMembers as getServerSideProps,
  type PageProps,
} from "@calcom/features/ee/organizations/pages/settings/getServerSidePropsMembers";

const Page = () => <MembersView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
