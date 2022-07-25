import { inferQueryOutput } from "@calcom/trpc/react";
import { TeamListItem } from "@calcom/ui/v2";

export default {
  title: "Team List Item",
  component: TeamListItem,
};

const team: inferQueryOutput<"viewer.teams.list">[number] = {
  id: 1,
  name: "Cal.com",
  slug: "cal",
  bio: "Super awesome team",
  role: "MEMBER",
  accepted: true,
};

export const Default = () => {
  <TeamListItem team={team} onActionSelect={() => console.log("do nothing")} key={1} />;
};
