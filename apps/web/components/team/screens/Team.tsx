import Link from "next/link";
import { TeamPageProps } from "pages/team/[slug]";
import React from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import { Avatar } from "@calcom/ui/v2";

import { useLocale } from "@lib/hooks/useLocale";

type TeamType = TeamPageProps["team"];
type MembersType = TeamType["members"];
type MemberType = MembersType[number];

const Team = ({ team }: TeamPageProps) => {
  const { t } = useLocale();

  const Member = ({ member }: { member: MemberType }) => {
    return (
      <Link key={member.id} href={`/${member.username}`}>
        <div className="sm:min-w-80 sm:max-w-80 dark:bg-darkgray-200 dark:hover:bg-darkgray-300 group flex h-full flex-col space-y-2 rounded-md bg-white p-4  hover:cursor-pointer hover:bg-gray-50 ">
          <Avatar
            size="md"
            alt={member.name || ""}
            imageSrc={WEBAPP_URL + "/" + member.username + "/avatar.png"}
          />
          <section className="line-clamp-4 mt-2 w-full space-y-1">
            <p className="font-medium text-neutral-900 dark:text-white">{member.name}</p>
            <p className="line-clamp-3 overflow-ellipsis text-sm font-normal text-neutral-500 dark:text-white">
              {member.bio || t("user_from_team", { user: member.name, team: team.name })}
            </p>
          </section>
        </div>
      </Link>
    );
  };

  const Members = ({ members }: { members: MembersType }) => {
    if (!members || members.length === 0) {
      return null;
    }

    return (
      <section className="lg:min-w-lg mx-auto flex min-w-full max-w-5xl flex-wrap justify-center gap-x-6 gap-y-6">
        {members.map((member) => {
          return member.username !== null && <Member key={member.id} member={member} />;
        })}
      </section>
    );
  };

  return (
    <div>
      <Members members={team.members} />
    </div>
  );
};

export default Team;
