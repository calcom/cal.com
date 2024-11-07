import MembersView from "@calcom/features/ee/organizations/pages/settings/members";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

export {
  getServerSidePropsForMembers as getServerSideProps,
  type PageProps,
} from "@calcom/features/ee/organizations/pages/settings/getServerSidePropsMembers";

export const getLayout = (page: React.ReactElement) => (
  <SettingsLayout containerClassName="lg:max-w-screen-2xl">{page}</SettingsLayout>
);

const Page = () => <MembersView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
