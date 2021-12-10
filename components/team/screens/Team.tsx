import { ArrowRightIcon } from "@heroicons/react/outline";
import { ArrowLeftIcon } from "@heroicons/react/solid";
import classnames from "classnames";
import Link from "next/link";
import { TeamPageProps } from "pages/team/[slug]";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";

import Avatar from "@components/ui/Avatar";
import Button from "@components/ui/Button";
import Text from "@components/ui/Text";

type TeamType = TeamPageProps["team"];
type MembersType = TeamType["members"];
type MemberType = MembersType[number];

const Team = ({ team }: TeamPageProps) => {
  const { t } = useLocale();

  const Member = ({ member }: { member: MemberType }) => {
    const classes = classnames(
      "group",
      "relative",
      "flex flex-col",
      "space-y-4",
      "p-4",
      "bg-white dark:bg-neutral-900 dark:border-0 dark:bg-opacity-8",
      "border border-neutral-200",
      "hover:cursor-pointer",
      "hover:border-brand dark:border-neutral-700 dark:hover:border-neutral-600",
      "rounded-sm",
      "hover:shadow-md"
    );

    return (
      <Link key={member.id} href={`/${member.username}`}>
        <div className={classes}>
          <ArrowRightIcon
            className={classnames(
              "text-black dark:text-white",
              "absolute top-4 right-4",
              "h-4 w-4",
              "transition-opacity",
              "opacity-0 group-hover:opacity-100 group-hover:block"
            )}
          />

          <div>
            <Avatar alt={member.name || ""} imageSrc={member.avatar} className="w-12 h-12" />
            <section className="space-y-2">
              <Text variant="title">{member.name}</Text>
              <Text variant="subtitle" className="w-6/8">
                {member.bio}
              </Text>
            </section>
          </div>
        </div>
      </Link>
    );
  };

  const Members = ({ members }: { members: MembersType }) => {
    if (!members || members.length === 0) {
      return null;
    }

    return (
      <section className="flex flex-wrap justify-center max-w-5xl min-w-full mx-auto lg:min-w-lg gap-x-12 gap-y-6">
        {members.map((member) => {
          return member.username !== null && <Member key={member.id} member={member} />;
        })}
      </section>
    );
  };

  return (
    <div>
      <Members members={team.members} />
      {team.eventTypes.length > 0 && (
        <aside className="mt-8 text-center dark:text-white">
          <Button color="secondary" href={`/team/${team.slug}`} shallow={true} StartIcon={ArrowLeftIcon}>
            {t("go_back")}
          </Button>
        </aside>
      )}
    </div>
  );
};

export default Team;
