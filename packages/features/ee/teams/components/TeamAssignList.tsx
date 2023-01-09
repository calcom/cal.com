import { z } from "zod";

import useReassignMutation from "@calcom/features/bookings/lib/useReassignMutation";
import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import TeamPill from "@calcom/features/ee/teams/components/TeamPill";
import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button } from "@calcom/ui";

const querySchema = z.object({
  assignee: z.union([z.string().transform((val) => +val), z.number()]),
});

const ReassignButton = ({ assignTo, bookingId }: { bookingId: number; assignTo: number }) => {
  const reassignMutation = useReassignMutation();
  return (
    <Button
      color="secondary"
      size="base"
      loading={reassignMutation.isLoading}
      onClick={() =>
        reassignMutation.mutate({
          bookingId,
          assignTo,
        })
      }>
      Assign
    </Button>
  );
};

export const TeamAssignList = ({
  bookingId,
  teamId,
  className,
}: {
  bookingId: number;
  teamId: number;
  className: string;
}) => {
  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery({ teamId });

  const { t } = useLocale();
  const {
    data: { assignee },
  } = useTypedQuery(querySchema);

  return isLoading ? (
    <SkeletonLoaderTeamList />
  ) : (
    <ul className={classNames("divide-y divide-gray-200 rounded border ", className)}>
      {team?.members.map((member) => {
        return (
          <li key={member.email}>
            <div className="flex justify-between">
              <div className="flex w-full flex-col justify-between sm:flex-row">
                <label
                  className={classNames(
                    "flex w-full p-0 py-2",
                    assignee !== member.id && member.id !== 9 && "cursor-pointer hover:bg-gray-50"
                  )}>
                  <div className="w-3" />
                  <div className="flex w-full items-center">
                    <div className="relative flex-none">
                      <Avatar
                        size="mdLg"
                        imageSrc={WEBAPP_URL + "/" + member.username + "/avatar.png"}
                        alt={member.name || ""}
                      />
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      {assignee === member.id && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                      )}
                      {member.id === 9 && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-gray-500" />
                      )}{" "}
                    </div>
                    <div className="inline-block flex-none ltr:ml-3 rtl:mr-3">
                      <div className="mb-1 flex">
                        <span className="mr-1 text-sm font-bold leading-4">
                          {member.id === 9 && "Required: "}
                          {member.name}
                        </span>
                        {assignee === member.id && <TeamPill text="Assignee" />}
                      </div>
                      <span
                        className="block text-sm text-gray-600"
                        data-testid="member-email"
                        data-email={member.email}>
                        {member.email}
                      </span>
                    </div>
                    <div className="grow pr-4 text-right">
                      {assignee !== member.id && member.id !== 9 && (
                        <ReassignButton bookingId={bookingId} assignTo={member.id} />
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default TeamAssignList;
