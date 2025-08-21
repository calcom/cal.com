"use client";
import React from "react";
import ProfileSettingsView from "@calid/features/teams/ProfileSettingsView";
import { TeamEditLayout } from "@calid/features/teams/TeamEditLayout";

const Page = ({ params }: { params: { id: string } }) => {

  const resolvedParams = React.use(params);
  const teamId = resolvedParams.id;

  return (
    <TeamEditLayout teamId={teamId}>
      <ProfileSettingsView teamId={teamId} />
    </TeamEditLayout>
  );
};

export default Page;
