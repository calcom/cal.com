"use client";

import NoSSR from "@calcom/lib/components/NoSSR";

import { AdminTeamsTable } from "../components/AdminTeamsTable";

const AdminTeamsListingView = () => {
  return (
    <NoSSR>
      <AdminTeamsTable />
    </NoSSR>
  );
};

export default AdminTeamsListingView;

