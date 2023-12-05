// card that will be displayed for an OAuth clients
// name, logo, onDelete and onUpdate props
import React from "react";

import { classNames } from "@calcom/lib";
import type { Avatar } from "@calcom/prisma/client";
import { Button } from "@calcom/ui";

type OAuthClientCardProps = {
  name: string;
  logo?: Avatar;
  redirect_uris: string[];
  permissions: string;
  lastItem: boolean;
};

export const OAuthClientList = ({
  name,
  logo,
  redirect_uris,
  permissions,
  lastItem,
}: OAuthClientCardProps) => {
  return (
    <div
      className={classNames(
        "flex w-full justify-between px-4 py-4 sm:px-6",
        lastItem ? "" : "border-subtle border-b"
      )}>
      <div>
        <div className="flex gap-1">
          <p className="font-semibold">{name}</p>
        </div>
        {!!logo && (
          <div>
            <>{logo}</>
          </div>
        )}
        <div className=" w-[85%] gap-1">
          <span className="text-sm font-semibold">Redirect uris: </span>
          {redirect_uris.map((item, index) => (redirect_uris.length === index + 1 ? `${item}` : `${item}, `))}
        </div>
        <div className="border-subtle">
          <span className="text-sm font-semibold">Permissions: </span>Read bookings, write bookings
        </div>
      </div>
      <div className="flex items-center">
        <Button className="bg-red-500 text-white">Delete</Button>
      </div>
    </div>
  );
};
