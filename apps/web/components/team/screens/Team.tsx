import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { md } from "@calcom/lib/markdownIt";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { TeamWithMembers } from "@calcom/lib/server/queries/teams";

import { UserAvatar } from "@components/ui/avatar/UserAvatar";

type TeamType = Omit<NonNullable<TeamWithMembers>, "inviteToken">;
type MembersType = TeamType["members"];
type MemberType = Pick<MembersType[number], "id" | "name" | "bio" | "username" | "organizationId"> & {
  safeBio: string | null;
  orgOrigin: string;
};

const Member = ({ member, teamName }: { member: MemberType; teamName: string | null }) => {
  const routerQuery = useRouterQuery();
  const { t } = useLocale();
  const isBioEmpty = !member.bio || !member.bio.replace("<p><br></p>", "").length;

  // We don't want to forward orgSlug and user which are route params to the next route
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  return (
    <Link
      key={member.id}
      href={{ pathname: `${member.orgOrigin}/${member.username}`, query: queryParamsToForward }}>
      <div className="sm:min-w-80 sm:max-w-80 bg-default hover:bg-muted border-subtle group flex min-h-full flex-col space-y-2 rounded-md border p-4 hover:cursor-pointer">
        <UserAvatar size="md" user={member} />
        <section className="mt-2 line-clamp-4 w-full space-y-1">
          <p className="text-default font-medium">{member.name}</p>
          <div className="text-subtle line-clamp-3 overflow-ellipsis text-sm font-normal">
            {!isBioEmpty ? (
              <>
                <div
                  className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: md.render(markdownToSafeHTML(member.bio)) }}
                />
              </>
            ) : (
              t("user_from_team", { user: member.name, team: teamName })
            )}
          </div>
        </section>
      </div>
    </Link>
  );
};

const Members = ({ members, teamName }: { members: MemberType[]; teamName: string | null }) => {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="team-members-container"
      className="lg:min-w-lg mx-auto flex min-w-full max-w-5xl flex-wrap justify-center gap-x-6 gap-y-6">
      {members.map((member) => {
        return member.username !== null && <Member key={member.id} member={member} teamName={teamName} />;
      })}
    </section>
  );
};

const Team = ({ members, teamName }: { members: MemberType[]; teamName: string | null }) => {
  return (
    <div>
      <Members members={members} teamName={teamName} />
    </div>
  );
};

export default Team;
