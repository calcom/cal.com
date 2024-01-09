"use client";

import NoSSR from "@calcom/core/components/NoSSR";
import { Button, Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import LicenseRequired from "../../common/components/LicenseRequired";
import { UsersTable } from "../components/UsersTable";

const DeploymentUsersListPage = () => {
  return (
    <LicenseRequired>
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
      <NoSSR>
        <UsersTable />
      </NoSSR>
    </LicenseRequired>
  );
};

DeploymentUsersListPage.getLayout = getLayout;

export default DeploymentUsersListPage;
