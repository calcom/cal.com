import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { Avatar, Button } from "@calcom/ui";

const ReassignButton = ({ assignTo, bookingId }: { bookingId: number; assignTo: number }) => {
  return (
    <Button
      color="secondary"
      size="base"
      // loading={isLoading}
      onClick={() =>
        // reassign booking to new host, backend work needed
        console.log("reassign")
      }>
      Assign
    </Button>
  );
};

export type Host = {
  user: {
    id: number;
    name: string | null;
    email: string;
    username: string | null;
  };
  isFixed: boolean;
};

export const TeamAssignList = ({
  bookingId,
  teamId,
  className,
  hosts,
  assignedHosts,
}: {
  bookingId: number;
  teamId: number;
  hosts?: Host[];
  className: string;
  assignedHosts?: string[];
}) => {
  const hostToReassign = hosts?.filter(
    (host) => !assignedHosts?.find((assignedHost) => assignedHost === host.user.email)
  );

  // only show available hosts, backend work needed

  if (!hostToReassign) {
    return <div>No available hosts</div>;
  }

  return (
    <ul className={classNames("divide-y divide-gray-200 rounded border ", className)}>
      {hostToReassign
        .filter((host) => !host.isFixed)
        .map((host) => {
          return (
            <li key={host.user.id}>
              <div className="flex justify-between">
                <div className="flex w-full flex-col justify-between sm:flex-row">
                  <label className="flex w-full p-0 py-2 first-letter:cursor-pointer hover:bg-gray-50">
                    <div className="w-3" />
                    <div className="flex w-full items-center">
                      <div className="relative flex-none">
                        <Avatar
                          size="mdLg"
                          imageSrc={`${WEBAPP_URL}/${host.user.username}/avatar.png`}
                          alt={host.user.name || ""}
                        />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      </div>
                      <div className="inline-block flex-none ltr:ml-3 rtl:mr-3">
                        <div className="mb-1 flex">
                          <span className="mr-1 text-sm font-bold leading-4">{host.user.name}</span>
                        </div>
                        <span
                          className="block text-sm text-gray-600"
                          data-testid="member-email"
                          data-email={host.user.email}>
                          {host.user.email}
                        </span>
                      </div>
                      <div className="grow pr-4 text-right">
                        <ReassignButton bookingId={bookingId} assignTo={host.user.id} />
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
