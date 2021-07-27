import React from "react";
import Text from "@components/ui/Text";
import Link from "next/link";
import Avatar from "@components/Avatar";

const Team = ({ team }) => {
  const Member = ({ member }) => {
    return (
      <Link key={member.id} href={`/${member.user.username}`}>
        <div className="hover:cursor-pointer flex flex-col justify-center items-center text-center">
          <Avatar user={member.user} className="mx-auto w-20 h-20 rounded-full mb-4" />
          <Text variant="title" className="text-gray-800 dark:text-white mb-1">
            {member.user.name}
          </Text>
          <p className="text-gray-600 dark:text-white">{member.user.bio}</p>
        </div>
      </Link>
    );
  };

  const Members = ({ members }) => {
    if (!members || members.length === 0) {
      return null;
    }

    return (
      <section className="bg-white dark:bg-opacity-5 text-black dark:text-white grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 p-8">
        {members.map((member) => {
          return <Member key={member.id} member={member} />;
        })}
      </section>
    );
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-1">{team.name}</h1>
      </div>
      <Members members={team.members} />
    </>
  );
};

export default Team;
