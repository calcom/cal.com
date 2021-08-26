import MemberListItem from "./MemberListItem";

export default function MemberList(props) {

  const selectAction = (action: string, member) => {
    switch (action) {
      case "remove":
        props.onRemoveMember(member);
        break;
    }
  };

  return (
    <div>
      <ul className="bg-white border px-4 mb-2 rounded divide-y divide-gray-200">
        {props.members.map((member) => (
          <MemberListItem
            onChange={props.onChange}
            key={member.id}
            member={member}
            onActionSelect={(action: string) => selectAction(action, member)} />
        ))}
      </ul>
    </div>
  );
}
