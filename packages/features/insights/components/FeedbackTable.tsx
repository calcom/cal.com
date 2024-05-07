import { Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { Avatar, EmptyScreen, Button } from "@calcom/ui";

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
    <Table>
      <TableBody>
        <>
          {data && data?.length > 0 ? (
            data?.map((item) => (
              <TableRow key={item.userId}>
                <TableCell className="flex flex-row">
                  <Avatar
                    alt={item.user.name || ""}
                    size="sm"
                    imageSrc={getUserAvatarUrl({ avatarUrl: item.user.avatarUrl })}
                    title={item.user.name || ""}
                    className="m-2"
                  />
                  <p className="text-default mx-0 my-auto">
                    <strong>{item.user.name}</strong>
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <Text>
                    <strong className="text-default">{item.rating}</strong>
                  </Text>
                </TableCell>
                <TableCell className="text-right">
                  <Text>
                    <strong className="text-default">{item.feedback}</strong>
                  </Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyScreen
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
        </>
      </TableBody>
    </Table>
  );
};
