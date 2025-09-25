"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import { Tooltip } from "@calid/features/ui/components/tooltip";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";

export const FeedbackTable = ({
  data,
}: {
  data:
    | {
        userId: number | null;
        user: Pick<User, "avatarUrl" | "name">;
        emailMd5?: string;
        username?: string;
        rating: number | null;
        feedback: string | null;
      }[]
    | undefined;
}) => {
  const { t } = useLocale();
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
            <div className="flex items-center space-x-4">
              <div className="text-default text-sm font-medium">{item.rating}</div>
              <Tooltip content={item.feedback}>
                <div className="text-default max-w-32 truncate text-sm font-medium md:max-w-52">
                  {item.feedback}
                </div>
              </Tooltip>
            </div>
          </div>
        ))
      ) : (
        <BlankCard
          Icon="zap"
          headline={t("no_ratings")}
          description={t("no_ratings_description")}
          buttonRaw={
            <Button target="_blank" color="secondary" href="/workflows">
              {t("workflows")}
            </Button>
          }
        />
      )}
    </div>
  );
};
