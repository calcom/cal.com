"use client";

import NoSSR from "@calcom/lib/components/NoSSR";

import { TeamsTable } from "./TeamsTable";

const TeamsListingView = () => {
  return (
    <>
      <NoSSR>
        <TeamsTable />
      </NoSSR>
    </>
  );
};

export default TeamsListingView;
