import { Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui";

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
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="text-default">Name</TableCell>
          <TableCell className="text-default">Level</TableCell>
          <TableCell className="text-default">Meetings</TableCell>
          <TableCell className="text-default">Cancelled</TableCell>
          <TableCell className="text-default">No Shows (Host)</TableCell>
          <TableCell className="text-default">No Shows (Guests)</TableCell>
          <TableCell className="text-default">Calibration</TableCell>
          <TableCell className="text-default">Date Activated</TableCell>
          <TableCell className="text-default">Weights</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="flex flex-row">
            <Avatar
              alt=""
              size="sm"
              imageSrc="https://cal.com/api/avatar/c0e68239-b19e-4d30-b4f8-cf0b4b4cf457.png"
              title=""
              className="m-2"
            />
            <div>
              <p className="text-default mx-0 my-auto mt-1">
                <strong> Peer Richelsen</strong>
              </p>
              <p className="-mt-1.5">peer@cal.com</p>
            </div>
          </TableCell>
          <TableCell className="text-default">11</TableCell>
          <TableCell className="text-default">20</TableCell>
          <TableCell className="text-default">4</TableCell>
          <TableCell className="text-default">1</TableCell>
          <TableCell className="text-default">2</TableCell>
          <TableCell className="text-default">1.0</TableCell>
          <TableCell className="text-default">Oct. 4th 2024</TableCell>
          <TableCell className="text-default">100%</TableCell>
        </TableRow>
        <>
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
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
                    <strong className="text-default">{item.count}</strong>
                  </Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>{/* No members found */}</TableCell>
            </TableRow>
          )}
        </>
      </TableBody>
    </Table>
  );
};
