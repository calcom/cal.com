import { Member } from "@lib/member";
import { TeamWithMembers } from "@lib/queries/teams";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: { team: TeamWithMembers; members: Member[] }) {
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
