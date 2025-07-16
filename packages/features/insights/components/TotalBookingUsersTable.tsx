import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui/components/avatar";

export const TotalBookingUsersTable = ({
  data,
}: {
  data:
    | {
        userId: number | null;
        user: Pick<User, "avatarUrl" | "name">;
        emailMd5?: string;
        count: number;
        username?: string;
      }[]
    | undefined;
}) => {
  const filteredData = data && data?.length > 0 ? data?.filter((item) => !!item.user) : [];
  return (
    <div className="overflow-hidden rounded-md">
      {filteredData.length > 0 ? (
        filteredData.map((item) => (
          <div
            key={item.userId}
            className="border-subtle flex items-center justify-between border-b px-4 py-3 last:border-b-0">
            <div className="flex items-center">
              <Avatar
                alt={item.user.name || ""}
                size="sm"
                imageSrc={getUserAvatarUrl({ avatarUrl: item.user.avatarUrl })}
                title={item.user.name || ""}
                className="mr-3"
              />
              <div className="text-default text-sm font-medium">{item.user.name}</div>
            </div>
            <div className="text-default text-sm font-medium">{item.count}</div>
          </div>
        ))
      ) : (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">No members found</p>
        </div>
      )}
    </div>
  );
};
