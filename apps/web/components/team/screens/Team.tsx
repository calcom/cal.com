import Link from "next/link";
import { TeamPageProps } from "pages/team/[slug]";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { Avatar } from "@calcom/ui";

import { useLocale } from "@lib/hooks/useLocale";

type TeamType = TeamPageProps["team"];
type MembersType = TeamType["members"];
type MemberType = MembersType[number];

const Member = ({ member, teamName }: { member: MemberType; teamName: string | null }) => {
  const { t } = useLocale();

  return (
    <Link key={member.id} href={`/${member.username}`}>
      <div className="sm:min-w-80 sm:max-w-80 dark:bg-darkgray-200 dark:hover:bg-darkgray-300 group flex min-h-full w-[90%] flex-col space-y-2 rounded-md bg-white p-4  hover:cursor-pointer hover:bg-gray-50 ">
        <Avatar
          size="md"
          alt={member.name || ""}
          imageSrc={WEBAPP_URL + "/" + member.username + "/avatar.png"}
        />
        <section className="line-clamp-4 mt-2 w-full space-y-1">
          <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
          <p className="line-clamp-3 overflow-ellipsis text-sm font-normal text-gray-500 dark:text-white">
            {member.bio || t("user_from_team", { user: member.name, team: teamName })}
          </p>
        </section>
      </div>
    </Link>
  );
};

const Members = ({ members, teamName }: { members: MembersType; teamName: string | null }) => {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section className="lg:min-w-lg mx-auto flex min-w-full max-w-5xl flex-wrap justify-center gap-x-6 gap-y-6">
      {members.map((member) => {
        return member.username !== null && <Member key={member.id} member={member} teamName={teamName} />;
      })}
    </section>
  );
};

const Team = ({ team }: TeamPageProps) => {
  return (
    <div>
      <Members members={team.members} teamName={team.name} />
    </div>
  );
};

export default Team;
