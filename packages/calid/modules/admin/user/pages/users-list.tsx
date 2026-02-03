"use client";

import NoSSR from "@calcom/lib/components/NoSSR";

import { AdminUsersTable } from "../components/AdminUsersTable";

const AdminUsersListPage = () => {
  return (
    <NoSSR>
      <AdminUsersTable />
    </NoSSR>
  );
};

export default AdminUsersListPage;
