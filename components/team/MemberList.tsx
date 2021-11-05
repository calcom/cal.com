import { Member } from "@lib/member";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: {
  members: Member[];
  onRemoveMember: (text: Member) => void;
  onChange: (text: string) => void;
}) {
  const selectAction = (action: string, member: Member) => {
    switch (action) {
      case "remove":
        props.onRemoveMember(member);
        break;
    }
  };

  return (
    <div>
      <ul className="px-6 mb-2 -mx-6 bg-white border divide-y divide-gray-200 rounded sm:px-4 sm:mx-0">
        {props.members.map((member) => (
          <MemberListItem
            onChange={props.onChange}
            key={member.id}
            member={member}
            onActionSelect={(action: string) => selectAction(action, member)}
          />
        ))}
      </ul>
    </div>
  );
}
