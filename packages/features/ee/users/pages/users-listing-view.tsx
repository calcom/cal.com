"use client";

import NoSSR from "@calcom/core/components/NoSSR";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import { UsersTable } from "../components/UsersTable";

const DeploymentUsersListPage = () => {
  return (
    <>
      <NoSSR>
        <UsersTable />
      </NoSSR>
    </>
  );
};

DeploymentUsersListPage.getLayout = getLayout;

export default DeploymentUsersListPage;
