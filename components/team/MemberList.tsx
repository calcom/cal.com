import MemberListItem from "./MemberListItem";
import { Member } from "@lib/member";

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
      <ul className="px-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
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
