import { inferQueryOutput } from "@lib/trpc";

import MemberListItem from "./MemberListItem";

interface Props {
  team: inferQueryOutput<"viewer.teams.get">;
  members: inferQueryOutput<"viewer.teams.get">["members"];
}

export default function MemberList(props: Props) {
  if (!props.members.length) return <></>;

  return (
    <div>
      <ul className="px-6 mb-2 -mx-6 bg-white border divide-y divide-gray-200 rounded sm:px-4 sm:mx-0">
        {props.members?.map((member) => (
          <MemberListItem key={member.id} member={member} team={props.team} />
        ))}
      </ul>
    </div>
  );
}
