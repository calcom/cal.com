import { Asterisk, Clipboard } from "lucide-react";
import React from "react";

import { classNames } from "@calcom/lib";
import type { Avatar } from "@calcom/prisma/client";
import { Button, showToast } from "@calcom/ui";

type OAuthClientCardProps = {
  name: string;
  logo?: Avatar;
  redirect_uris: string[];
  permissions: number;
  lastItem: boolean;
  id: string;
  secret: string;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
};

export const OAuthClientCard = ({
  name,
  logo,
  redirect_uris,
  id,
  secret,
  lastItem,
  onDelete,
  isLoading,
}: OAuthClientCardProps) => {
  return (
    <div
      className={classNames(
        "flex w-full justify-between px-4 py-4 sm:px-6",
        lastItem ? "" : "border-subtle border-b"
      )}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          <p className="font-semibold">
            Name: <span className="font-normal">{name}</span>
          </p>
        </div>
        {!!logo && (
          <div>
            <>{logo}</>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="font-semibold">Client Id:</div> <div>{id}</div>
            <Clipboard
              type="button"
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(secret);
                showToast("Client id copied to clipboard.", "success");
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-semibold">Client Secret:</div>
          <div className="flex items-center justify-center rounded-md">
            {[...new Array(20)].map((_, index) => (
              <Asterisk key={`${index}asterisk`} className="h-2 w-2" />
            ))}
            <Clipboard
              type="button"
              className="ml-2 h-4 w-4 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(secret);
                showToast("Client secret copied to clipboard.", "success");
              }}
            />
          </div>
        </div>
        <div className="border-subtle text-sm">
          <span className="font-semibold">Permissions: </span>Read bookings, write bookings
        </div>
        <div className="flex gap-1 text-sm">
          <span className="font-semibold">Redirect uris: </span>
          {redirect_uris.map((item, index) => (redirect_uris.length === index + 1 ? `${item}` : `${item}, `))}
        </div>
      </div>
      <div className="flex items-center">
        <Button
          className="bg-red-500 text-white"
          loading={isLoading}
          disabled={isLoading}
          onClick={() => onDelete(id)}>
          Delete
        </Button>
      </div>
    </div>
  );
};
