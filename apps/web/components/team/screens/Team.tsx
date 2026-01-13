import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { TeamWithMembers } from "@calcom/features/ee/teams/lib/queries";
import type { UserProfile } from "@calcom/types/UserProfile";
import { UserAvatar } from "@calcom/ui/components/avatar";

type TeamType = Omit<NonNullable<TeamWithMembers>, "inviteToken">;
type MembersType = TeamType["members"];
type MemberType = Pick<
  MembersType[number],
  "id" | "name" | "bio" | "username" | "organizationId" | "avatarUrl"
> & {
  profile: Omit<UserProfile, "upId">;
  safeBio: string | null;
  bookerUrl: string;
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
      href={{ pathname: `${member.bookerUrl}/${member.username}`, query: queryParamsToForward }}>
      <div className="bg-default hover:bg-cal-muted border-subtle group flex min-h-full flex-col stack-y-2 rounded-md border p-4 transition hover:cursor-pointer sm:w-80">
        <UserAvatar noOrganizationIndicator size="md" user={member} />
        <section className="mt-2 line-clamp-4 w-full stack-y-1">
          <p className="text-default font-medium">{member.name}</p>
          <div className="text-subtle line-clamp-3 text-ellipsis text-sm font-normal">
            {!isBioEmpty ? (
              <>
                <div
                  className="  text-subtle wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(member.bio) }}
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
      className="flex flex-col flex-wrap justify-center gap-5 sm:flex-row">
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
