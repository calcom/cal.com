import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";

import { useOnboardingStore } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Badge, Button, Input, SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui";

type TeamMember = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

const AddNewTeamMembers = () => {
  const session = useSession();

  if (session.status === "loading") {
    return <SkeletonContainer>Loading...</SkeletonContainer>;
  }
  return <AddNewTeamMembersForm />;
};

export const AddNewTeamMembersForm = () => {
  const { t } = useLocale();
  const { teams, invitedMembers, addInvitedMember, removeInvitedMember } = useOnboardingStore();

  const teamIds = teams.filter((team) => team.isBeingMigrated && team.id > 0).map((team) => team.id);

  const results = trpc.useQueries((t) => teamIds.map((teamId) => t.viewer.teams.listMembers({ teamId })));

  const isLoading = results.some((result) => result.isLoading);

  // Combine all members and remove duplicates
  const uniqueMembers = results
    .reduce<TeamMember[]>((acc, result) => {
      if (result.data?.members) {
        return [...acc, ...result.data.members];
      }
      return acc;
    }, [])
    .filter((member, index, self) => index === self.findIndex((m) => m.email === member.email));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ email: string }>();

  const onSubmit = handleSubmit((data) => {
    addInvitedMember({ email: data.email });
    reset();
  });

  if (isLoading) {
    return (
      <SkeletonContainer as="div" className="space-y-6">
        <div className="space-y-4">
          <SkeletonText className="h-4 w-32" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <SkeletonText className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
        <SkeletonButton className="w-full" />
      </SkeletonContainer>
    );
  }

  return (
    <>
      <div>
        <form onSubmit={onSubmit} className="mb-4 flex space-x-2">
          <Input
            type="email"
            {...register("email", { required: true })}
            placeholder="colleague@company.com"
            className="flex-grow"
          />
          <Button type="submit" StartIcon="plus">
            Add
          </Button>
        </form>
        <ul
          className="border-subtle divide-subtle max-h-[300px] divide-y overflow-y-auto rounded-md border"
          data-testid="pending-member-list">
          {invitedMembers.map((member) => (
            <li key={member.email} className="flex items-center justify-between px-5 py-2">
              <div className="flex items-center space-x-3">
                <Avatar size="sm" alt={member.email} />
                <div className="flex gap-1">
                  <span className="text-subtle text-sm">{member.email}</span>
                  <Badge>{t("pending")}</Badge>
                </div>
              </div>
              <Button
                variant="icon"
                color="minimal"
                StartIcon="x"
                onClick={() => removeInvitedMember(member.email)}
              />
            </li>
          ))}
          {uniqueMembers.map((member) => (
            <li key={member.email} className="flex items-center justify-between px-5 py-2">
              <div className="flex items-center space-x-3">
                <Avatar size="sm" imageSrc={member.avatarUrl} alt={member.name || member.email} />
                <div className="flex flex-col">
                  <span className="text-emphasis text-sm">{member.name || member.email}</span>
                  {member.name && <span className="text-subtle text-xs">{member.email}</span>}
                </div>
              </div>
              <span className="text-subtle text-xs">{t("prepopulated_from_current_teams")}</span>
            </li>
          ))}
        </ul>
      </div>
      <hr className="border-subtle my-6" />
    </>
  );
};

export default AddNewTeamMembers;
