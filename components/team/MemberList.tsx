import { useState } from "react";

import { Member } from "@lib/member";
import { TeamWithMembers } from "@lib/queries/teams";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: { team: TeamWithMembers }) {
  const [members, setMembers] = useState<Member[]>(props.team?.members || []);

  const loadMembers = () =>
    fetch("/api/teams/" + props.team?.id + "/membership")
      .then((res) => res.json())
      .then((data) => setMembers(data.members));

  const onRemoveMember = (member: Member) => {
    return fetch("/api/teams/" + props.team?.id + "/membership", {
      method: "DELETE",
      body: JSON.stringify({ userId: member.id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(loadMembers);
  };

  const selectAction = (action: string, member: Member) => {
    switch (action) {
      case "remove":
        onRemoveMember(member);
        break;
    }
  };

  if (!members.length) return <></>;

  return (
    <div>
      <ul className="px-6 mb-2 -mx-6 bg-white border divide-y divide-gray-200 rounded sm:px-4 sm:mx-0">
        {members?.map((member) => (
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
