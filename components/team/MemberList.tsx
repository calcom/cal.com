import { useEffect, useState } from "react";

import { Member } from "@lib/member";
import { TeamWithMembers } from "@lib/queries/teams";

import MemberInvitationModal from "@components/team/MemberInvitationModal";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: { team: TeamWithMembers; onChange: (text: string) => void }) {
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  // const [inviteModalTeam, setInviteModalTeam] = useState<Team | null | undefined>();
  const [members, setMembers] = useState<Member[]>([]);

  const loadMembers = () =>
    fetch("/api/teams/" + props.team?.id + "/membership")
      .then((res) => res.json())
      .then((data) => setMembers(data.members));

  useEffect(() => {
    loadMembers();
  }, []);

  const onMemberInvitationModalExit = () => {
    loadMembers();
    setShowMemberInvitationModal(false);
  };

  const onRemoveMember = (member: Member) => {
    return fetch("/api/teams/" + props.team?.id + "/membership", {
      method: "DELETE",
      body: JSON.stringify({ userId: member.id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(loadMembers);
  };

  // const onInviteMember = (team: Team | null | undefined) => {
  //   setShowMemberInvitationModal(true);
  //   setInviteModalTeam(team);
  // };

  const selectAction = (action: string, member: Member) => {
    switch (action) {
      case "remove":
        onRemoveMember(member);
        break;
    }
  };

  return (
    <div>
      <ul className="px-6 mb-2 -mx-6 bg-white border divide-y divide-gray-200 rounded sm:px-4 sm:mx-0">
        {members.map((member) => (
          <MemberListItem
            onChange={props.onChange}
            key={member.id}
            member={member}
            onActionSelect={(action: string) => selectAction(action, member)}
          />
        ))}
      </ul>
      {showMemberInvitationModal && (
        <MemberInvitationModal team={props.team} onExit={onMemberInvitationModalExit} />
      )}
    </div>
  );
}
