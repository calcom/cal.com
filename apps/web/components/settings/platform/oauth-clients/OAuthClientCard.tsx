import { useRouter } from "next/navigation";
import React from "react";

import type { PERMISSION_MAP } from "@calcom/platform-constants";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants";
import type { Avatar } from "@calcom/prisma/client";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type OAuthClientCardProps = {
  name: string;
  logo?: Avatar;
  redirectUris: string[];
  bookingRedirectUri: string | null | undefined;
  bookingCancelRedirectUri: string | null | undefined;
  bookingRescheduleRedirectUri: string | null | undefined;
  areEmailsEnabled: boolean | undefined;
  areDefaultEventTypesEnabled: boolean;
  areCalendarEventsEnabled: boolean;
  permissions: Array<keyof typeof PERMISSION_MAP>;
  lastItem: boolean;
  id: string;
  secret: string;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  organizationId: number;
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
  areDefaultEventTypesEnabled,
  areCalendarEventsEnabled,
  organizationId,
}: OAuthClientCardProps) => {
  const router = useRouter();

  const groupedPermissions = permissions.reduce<Record<string, { read: boolean; write: boolean }>>(
    (acc, permission) => {
      const [resource] = permission.split("_READ") as [string] | [string, string];
      const isRead = permission.endsWith("_READ");
      const isWrite = permission.endsWith("_WRITE");
      const key = resource.replace("_WRITE", "");

      if (!acc[key]) acc[key] = { read: false, write: false };
      if (isRead) acc[key].read = true;
      if (isWrite) acc[key].write = true;

      return acc;
    },
    {}
  );

  const clientPermissions = Object.entries(groupedPermissions).map(([resource, { read, write }], index) => {
    const permissionTypes = [];
    if (read) permissionTypes.push("read");
    if (write) permissionTypes.push("write");

    const permissionsMessage = permissionTypes.join("/");
    const groupedPermission = PERMISSIONS_GROUPED_MAP[resource as keyof typeof PERMISSIONS_GROUPED_MAP];
    const isLastItem = index === Object.keys(groupedPermissions).length - 1;

    return (
      <div key={resource} className="relative text-sm">
        &nbsp;{permissionsMessage} {groupedPermission?.label.toLowerCase()}
        {!isLastItem && ", "}
      </div>
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
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-2">
            <div className="font-semibold">Organization Id:</div>
            <div>{organizationId}</div>
            <Icon
              name="clipboard"
              type="button"
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(organizationId.toString());
                showToast("Organization id copied to clipboard.", "success");
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
        <div className="flex gap-1 text-sm">
          <span className="text-sm font-semibold">Default event types enabled:</span>{" "}
          {areDefaultEventTypesEnabled ? "Yes" : "No"}
        </div>
        <div className="flex gap-1 text-sm">
          <span className="text-sm font-semibold">Calendar events enabled:</span>{" "}
          {areCalendarEventsEnabled ? "Yes" : "No"}
        </div>
      </div>
      <div className="flex items-start gap-4">
        <Button
          color="primary"
          loading={isLoading}
          disabled={isLoading}
          onClick={() => router.push(`/settings/platform/oauth-clients/${id}/edit/webhooks`)}>
          Webhooks
        </Button>
        <Button
          color="secondary"
          loading={isLoading}
          disabled={isLoading}
          onClick={() => router.push(`/settings/platform/oauth-clients/${id}/edit`)}>
          Edit
        </Button>
        <Button color="destructive" loading={isLoading} disabled={isLoading} onClick={() => onDelete(id)}>
          Delete
        </Button>
      </div>
    </div>
  );
};
