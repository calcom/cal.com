import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui/components/avatar";

import { ChartCardItem } from "./ChartCard";

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
        filteredData.map((item, index) => (
          <ChartCardItem key={index} count={item.count} className="py-3">
            <div className="flex items-center">
              <Avatar
                alt={item.user.name || ""}
                size="sm"
                imageSrc={getUserAvatarUrl({ avatarUrl: item.user.avatarUrl })}
                title={item.user.name || ""}
                className="mr-3"
              />
              <div>{item.user.name}</div>
            </div>
          </ChartCardItem>
        ))
      ) : (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">No members found</p>
        </div>
      )}
    </div>
  );
};
