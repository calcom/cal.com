import { useDeleteOAuthClient } from "@pages/settings/organizations/platform/oauth-clients/hooks/usePersistOAuthClient";
import { Clipboard } from "lucide-react";
import React, { useState } from "react";

import { classNames } from "@calcom/lib";
import type { Avatar } from "@calcom/prisma/client";
import { Button, Input, showToast } from "@calcom/ui";

type OAuthClientCardProps = {
  name: string;
  logo?: Avatar;
  redirect_uris: string[];
  permissions: number;
  lastItem: boolean;
  id: string;
  secret: string;
};

export const OAuthClientList = ({
  name,
  logo,
  redirect_uris,
  permissions,
  id,
  secret,
  lastItem,
}: OAuthClientCardProps) => {
  const [inputValue, setInputValue] = useState(secret);
  const { mutateAsync, isLoading } = useDeleteOAuthClient({});

  const handleDelete = (id: string) => {
    mutateAsync({ id: id });
  };

  return (
    <div
      className={classNames(
        "flex w-full justify-between px-4 py-4 sm:px-6",
        lastItem ? "" : "border-subtle border-b"
      )}>
      <div>
        <div className="flex gap-1">
          <p className="font-semibold">
            Client: <span className="font-normal">{name}</span>
          </p>
        </div>
        {!!logo && (
          <div>
            <>{logo}</>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div>Client id: {id}</div>
        </div>
        <div className="flex items-center gap-2">
          <div>Client secret:</div>
          <div className="flex items-center rounded-md">
            <Input className="" readOnly={true} type="password" value={inputValue} />
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inputValue);
                showToast("Client secret copied successfully", "success");
              }}
              StartIcon={Clipboard}
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
        <Button className="bg-red-500 text-white" onClick={() => handleDelete(id)}>
          Delete
        </Button>
      </div>
    </div>
  );
};
