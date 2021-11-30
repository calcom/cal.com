import { useLocale } from "@lib/hooks/useLocale";
import { Member } from "@lib/member";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import MemberListItem from "./MemberListItem";

export default function MemberList(props: { teamId: number; members: Member[] }) {
  const utils = trpc.useContext();
  const { t } = useLocale();

  const removeMemberMutation = trpc.useMutation("viewer.teams.removeMember", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const onRemoveMember = (member: Member) =>
    removeMemberMutation.mutate({ teamId: props.teamId, memberId: member.id });

  const selectAction = (action: string, member: Member) => {
    switch (action) {
      case "remove":
        member;
        onRemoveMember(member);
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
