import { Member } from "@lib/member";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: { members: Member[] }) {
  // const onRemoveMember = (member: Member) => {
  //   return fetch("/api/teams/" + props.team?.id + "/membership", {
  //     method: "DELETE",
  //     body: JSON.stringify({ userId: member.id }),
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //   }).then(loadMembers);
  // };

  const selectAction = (action: string, member: Member) => {
    switch (action) {
      case "remove":
        member;
        // onRemoveMember(member);
        break;
    }
  };

  if (!props.members.length) return <></>;

  return (
    <div>
      <ul className="px-6 mb-2 -mx-6 bg-white border divide-y divide-gray-200 rounded sm:px-4 sm:mx-0">
        {props.members?.map((member) => (
          <MemberListItem
            key={member.id}
            member={member}
            onActionSelect={(action: string) => selectAction(action, member)}
          />
        ))}
      </ul>
    </div>
  );
}
