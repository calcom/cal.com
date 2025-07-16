import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui/components/avatar";

export const TotalUserFeedbackTable = ({
  data,
}: {
  data:
    | {
        userId: number | null;
        user: Pick<User, "avatarUrl" | "name">;
        emailMd5?: string;
        count?: number;
        averageRating?: number | null;
        username?: string;
      }[]
    | undefined;
}) => {
  return (
    <div className="overflow-hidden rounded-md">
      {data && data?.length > 0 ? (
        data?.map((item) => (
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
            <div className="text-default text-sm font-medium">
              {item.averageRating ? item.averageRating.toFixed(1) : item.count}
            </div>
          </div>
        ))
      ) : (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">No data found</p>
        </div>
      )}
    </div>
  );
};
