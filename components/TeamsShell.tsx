import React from "react";

import { Team } from "@lib/types/team";

import NavTabs from "./NavTabs";
import Shell from "./Shell";

export default function TeamShell({
  children,
  team,
  loading,
}: {
  children: React.ReactNode;
  team: Team;
  loading: boolean;
}) {
  const tabs = [
    {
      name: "Settings",
      href: `/teams/${team?.id}/settings`,
      //   icon: CogIcon,
    },
    {
      name: "Members",
      href: `/teams/${team?.id}/members`,
      //   icon: UserIcon,
    },
    {
      name: "Availability",
      href: `/teams/${team?.id}/availability`,
      //   icon: ClockIcon,
    },
  ];

  return (
    <Shell heading={loading ? "Teams" : team?.name} subtitle={"Manage this team"}>
      <div className="sm:mx-auto">
        <NavTabs tabs={tabs} />
      </div>
      <main className="max-w-4xl">{children}</main>
    </Shell>
  );
}
