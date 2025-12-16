"use client";

import NoSSR from "@calcom/lib/components/NoSSR";

import { PoliciesTable } from "../components/PoliciesTable";
import { CreatePolicyVersionForm } from "../components/CreatePolicyVersionForm";

const PoliciesListingView = () => {
  return (
    <NoSSR>
      <div className="space-y-6">
        <CreatePolicyVersionForm />
        <PoliciesTable />
      </div>
    </NoSSR>
  );
};

export default PoliciesListingView;
