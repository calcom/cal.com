import UsersListingView from "@calcom/features/ee/users/pages/users-listing-view";
import { Meta, Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const Page = () => {
  return (
    <>
      <Meta
        title="Users"
        description="A list of all the users in your account including their name, title, email and role."
        CTA={
          <div className="mt-4 space-x-5 sm:ml-16 sm:mt-0 sm:flex-none">
            {/* TODO: Add import users functionality */}
            {/* <Button disabled>Import users</Button> */}
            <Button href="/settings/admin/users/add">Add user</Button>
          </div>
        }
      />
      <UsersListingView />
    </>
  );
};
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
