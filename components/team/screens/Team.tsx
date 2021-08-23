import React from "react";
import Text from "@components/ui/Text";
import Link from "next/link";
import Avatar from "@components/Avatar";
import { ArrowRightIcon } from "@heroicons/react/outline";
import useTheme from "@components/Theme";
import classnames from "classnames";

const Team = ({ team }) => {
  useTheme();

  const Member = ({ member }) => {
    const classes = classnames(
      "group",
      "relative",
      "flex flex-col",
      "space-y-4",
      "p-4",
      "bg-white dark:bg-neutral-900 dark:border-0 dark:bg-opacity-8",
      "border border-neutral-200",
      "hover:cursor-pointer",
      "hover:border-black dark:border-neutral-700 dark:hover:border-neutral-600",
      "rounded-sm",
      "hover:shadow-md"
    );

    return (
      <Link key={member.id} href={`/${member.user.username}`}>
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

          <Avatar
            displayName={member.user.name}
            imageSrc={member.user.avatar}
            className="w-12 h-12 rounded-full"
          />

          <section className="space-y-2">
            <Text variant="title">{member.user.name}</Text>
            <Text variant="subtitle" className="w-6/8">
              {member.user.bio}
            </Text>
          </section>
        </div>
      </Link>
    );
  };

  const Members = ({ members }) => {
    if (!members || members.length === 0) {
      return null;
    }

    return (
      <section className="mx-auto min-w-full lg:min-w-lg max-w-5xl grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
        {members.map((member) => {
          return <Member key={member.id} member={member} />;
        })}
      </section>
    );
  };

  return (
    <article className="flex flex-col space-y-8 lg:space-y-12">
      <div className="mb-8 text-center">
        <Avatar
          displayName={team.name}
          imageSrc={team.logo}
          className="mx-auto w-20 h-20 rounded-full mb-4"
        />
        <Text variant="headline">{team.name}</Text>
      </div>
      <Members members={team.members} />
    </article>
  );
};

export default Team;
