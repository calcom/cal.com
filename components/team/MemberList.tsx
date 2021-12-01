import { Member } from "@lib/member";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: { teamId: number; members: Member[] }) {
  if (!props.members.length) return <></>;

  return (
    <div>
      <ul className="px-6 mb-2 -mx-6 bg-white border divide-y divide-gray-200 rounded sm:px-4 sm:mx-0">
        {props.members?.map((member) => (
          <MemberListItem key={member.id} member={member} teamId={props.teamId} />
        ))}
      </ul>
    </div>
  );
}
