import { useLocale } from "@lib/hooks/useLocale";
import { Member } from "@lib/member";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: {
  localeProp: string;
  members: Member[];
  onRemoveMember: (text: Member) => void;
  onChange: (text: string) => void;
}) {
  const { locale } = useLocale({ localeProp: props.localeProp });

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
            localeProp={locale}
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
