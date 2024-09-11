import UsersAddView from "@calcom/features/ee/users/pages/users-add-view";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const Page = () => (
  <>
    <Meta title="Add new user" description="Here you can add a new user." />
    <UsersAddView />
  </>
);
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
