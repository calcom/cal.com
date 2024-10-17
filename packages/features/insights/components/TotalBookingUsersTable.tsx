import { Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { Avatar, Icon } from "@calcom/ui";

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
  const { t } = useLocale();
  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="text-default text-center">Name</TableCell>
          <TableCell className="text-default text-center">Level</TableCell>
          <TableCell className="text-default text-center">Completed</TableCell>
          <TableCell className="text-default text-center">Cancelled</TableCell>
          <TableCell className="text-default text-center">No Shows (Host)</TableCell>
          <TableCell className="text-default text-center">No Shows (Guests)</TableCell>
          <TableCell className="text-default text-center">Calibration</TableCell>
          <TableCell className="text-default text-center">Date Activated</TableCell>{" "}
          {/* Not sure if needed */}
          <TableCell className="text-default text-center">Weights</TableCell>
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
          <TableCell className="text-default border-l text-center">11</TableCell>
          <TableCell className="text-default border-l text-center">20</TableCell>
          <TableCell className="text-default border-l text-center">4</TableCell>
          <TableCell className="text-default border-l text-center">1</TableCell>
          <TableCell className="text-default border-l text-center">2</TableCell>
          <TableCell className="text-default border-l text-center">
            <div className="flex w-full justify-center">
              1.0 <Icon name="pencil" className="mx-2 my-1 h-3 w-3" />{" "}
              {/* Edit button to change calibration */}
            </div>
          </TableCell>
          <TableCell className="text-default border-l text-center">Oct. 4th 2024</TableCell>
          <TableCell className="text-default border-l text-center">100%</TableCell>{" "}
          {/* Not sure what we do here. A global weight? */}
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
              <TableCell>{t("no_members_found")}</TableCell>
            </TableRow>
          )}
        </>
      </TableBody>
    </Table>
  );
};
