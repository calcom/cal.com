import { Suspense } from "react";

import { Button, Meta } from "@calcom/ui";
import { FiLoader } from "@calcom/ui/components/icon";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import LicenseRequired from "../../common/components/v2/LicenseRequired";
import { UsersTable } from "../components/UsersTable";

const DeploymentUsersListPage = () => {
  return (
    <LicenseRequired>
      <Meta title="Users" description="Here you can add a new user." />
      <div className="mb-4 w-full lg:flex ">
        <div className="w-full sm:flex sm:items-center">
          <div className="sm:flex-auto">
            {/* <h1 className="text-xl font-semibold text-gray-900">Users</h1> */}
            <p className="mt-2 w-full text-sm text-gray-700">
              A list of all the users in your account including their name, title, email and role.
            </p>
          </div>
          <div className="mt-4 space-x-5 sm:mt-0 sm:ml-16 sm:flex-none">
            <Button className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-300 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 sm:w-auto">
              Import users
            </Button>
            <Button
              href="/settings/admin/users/add"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 sm:w-auto">
              Add user
            </Button>
          </div>
        </div>
      </div>
      <Suspense fallback={<FiLoader />}>
        <UsersTable />
      </Suspense>
    </LicenseRequired>
  );
};

DeploymentUsersListPage.getLayout = getLayout;

export default DeploymentUsersListPage;
