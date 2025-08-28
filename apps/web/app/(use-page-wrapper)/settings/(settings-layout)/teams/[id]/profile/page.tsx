"use client";

import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamProfileView from "@calid/features/modules/teams/settings/TeamProfileView";
import React from "react";

const Page = ({ params }: { params: { id: string } }) => {
  const resolvedParams = React.use(params as { id: string });
  const teamId = resolvedParams.id;

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamProfileView teamId={Number(teamId)} />
    </TeamEditLayout>
  );
};

export default Page;
