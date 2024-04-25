import { useRouter } from "next/navigation";
import React from "react";

import { classNames } from "@calcom/lib";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants";
import type { Avatar } from "@calcom/prisma/client";
import { Button, Icon, showToast } from "@calcom/ui";

import { hasPermission } from "../../../../../../packages/platform/utils/permissions";

type OAuthClientCardProps = {
  name: string;
  logo?: Avatar;
  redirectUris: string[];
  bookingRedirectUri: string | null;
  bookingCancelRedirectUri: string | null;
  bookingRescheduleRedirectUri: string | null;
  areEmailsEnabled: boolean;
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
  redirectUris,
  bookingRedirectUri,
  bookingCancelRedirectUri,
  bookingRescheduleRedirectUri,
  permissions,
  id,
  secret,
  lastItem,
  onDelete,
  isLoading,
  areEmailsEnabled,
}: OAuthClientCardProps) => {
  const router = useRouter();

  const clientPermissions = Object.values(PERMISSIONS_GROUPED_MAP).map((value, index) => {
    let permissionsMessage = "";
    const hasReadPermission = hasPermission(permissions, value.read);
    const hasWritePermission = hasPermission(permissions, value.write);

    if (hasReadPermission || hasWritePermission) {
      permissionsMessage = hasReadPermission ? "read" : "write";
    }

    if (hasReadPermission && hasWritePermission) {
      permissionsMessage = "read/write";
    }

    return (
      !!permissionsMessage && (
        <div key={value.read} className="relative text-sm">
          &nbsp;{permissionsMessage} {`${value.label}s`.toLocaleLowerCase()}
          {Object.values(PERMISSIONS_GROUPED_MAP).length === index + 1 ? " " : ", "}
        </div>
      )
    );
  });

  return (
    <div
      className={classNames(
        "flex w-full justify-between px-4 py-4 sm:px-6",
        lastItem ? "" : "border-subtle border-b"
      )}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          <p className="font-semibold">
            Client name: <span className="font-normal">{name}</span>
          </p>
        </div>
        {!!logo && (
          <div>
            <>{logo}</>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-2">
            <div className="font-semibold">Client Id:</div>
            <div>{id}</div>
            <Icon
              name="clipboard"
              type="button"
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(id);
                showToast("Client id copied to clipboard.", "success");
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-semibold">Client Secret:</div>
          <div className="flex items-center justify-center rounded-md">
            {[...new Array(20)].map((_, index) => (
              <Icon name="asterisk" key={`${index}asterisk`} className="h-2 w-2" />
            ))}
            <Icon
              name="clipboard"
              type="button"
              className="ml-2 h-4 w-4 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(secret);
                showToast("Client secret copied to clipboard.", "success");
              }}
            />
          </div>
        </div>
        <div className="border-subtle flex text-sm">
          <span className="font-semibold">Permissions: </span>
          {permissions ? <div className="flex">{clientPermissions}</div> : <>&nbsp;Disabled</>}
        </div>
        <div className="flex gap-1 text-sm">
          <span className="font-semibold">Redirect uris: </span>
          {redirectUris.map((item, index) => (redirectUris.length === index + 1 ? `${item}` : `${item}, `))}
        </div>
        {bookingRedirectUri && (
          <div className="flex gap-1 text-sm">
            <span className="font-semibold">Booking redirect uri: </span> {bookingRedirectUri}
          </div>
        )}
        {bookingRescheduleRedirectUri && (
          <div className="flex gap-1 text-sm">
            <span className="font-semibold">Booking reschedule uri: </span> {bookingRescheduleRedirectUri}
          </div>
        )}
        {bookingCancelRedirectUri && (
          <div className="flex gap-1 text-sm">
            <span className="font-semibold">Booking cancel uri: </span> {bookingCancelRedirectUri}
          </div>
        )}
        <div className="flex gap-1 text-sm">
          <span className="text-sm font-semibold">Emails enabled:</span> {areEmailsEnabled ? "Yes" : "No"}
        </div>
      </div>
      <div className="flex items-start gap-4">
        <Button
          className="bg-subtle hover:bg-emphasis text-white"
          loading={isLoading}
          disabled={isLoading}
          onClick={() => router.push(`/settings/platform/oauth-clients/${id}/edit`)}>
          Edit
        </Button>
        <Button
          className="bg-red-500 text-white hover:bg-red-600"
          loading={isLoading}
          disabled={isLoading}
          onClick={() => onDelete(id)}>
          Delete
        </Button>
      </div>
    </div>
  );
};
