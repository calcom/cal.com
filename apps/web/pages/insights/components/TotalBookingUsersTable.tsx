import { Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui";

const TotalBookingUsersTable = ({
  isSuccess,
  data,
}: {
  isSuccess: boolean;
  data:
    | { userId: number | null; user: User; emailMd5?: string; count: number; Username?: string }[]
    | undefined;
}) => {
  return (
    <Table>
      <TableBody>
        <>
          {isSuccess ? (
            data?.map((item) => (
              <TableRow key={item.userId}>
                <TableCell className="flex flex-row">
                  <Avatar
                    alt={item.user.name || ""}
                    size="sm"
                    imageSrc={item.user.avatar}
                    title={item.user.name || ""}
                    className="m-2"
                    gravatarFallbackMd5={item.emailMd5}
                  />
                  <p className="my-auto mx-0">
                    <strong>{item.user.name}</strong>
                  </p>
                </TableCell>
                <TableCell>
                  <Text>
                    <strong>{item.count}</strong>
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

export { TotalBookingUsersTable };
