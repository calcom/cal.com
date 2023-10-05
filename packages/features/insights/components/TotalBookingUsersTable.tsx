import { Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui";

export const TotalBookingUsersTable = ({
  data,
}: {
  data:
    | { userId: number | null; user: User; emailMd5?: string; count: number; Username?: string }[]
    | undefined;
}) => {
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
                    imageSrc={`/${item.user.username}/avatar.png`}
                    title={item.user.name || ""}
                    className="m-2"
                  />
                  <p className="text-default mx-0 my-auto">
                    <strong>{item.user.name}</strong>
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <Text>
                    <strong className="text-default">{item.count}</strong>
                  </Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>No members found</TableCell>
            </TableRow>
          )}
        </>
      </TableBody>
    </Table>
  );
};
