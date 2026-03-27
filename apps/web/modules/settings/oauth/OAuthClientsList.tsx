"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { KeyIcon, SettingsIcon, UsersIcon } from "@coss/ui/icons";

import type { OAuthClientDetails } from "./view/OAuthClientDetailsDialog";

const getStatusBadge = (status: string, t: (key: string) => string): ReactNode => {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success">{t("approved")}</Badge>;
    case "REJECTED":
      return <Badge variant="red">{t("rejected")}</Badge>;
    case "PENDING":
    default:
      return <Badge variant="orange">{t("pending")}</Badge>;
  }
};

export const OAuthClientsList = ({
  clients,
  onSelectClient,
  showStatus = true,
}: {
  clients: OAuthClientDetails[];
  onSelectClient: (client: OAuthClientDetails) => void;
  showStatus?: boolean;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/settings/admin") ? "/settings/admin/oauth" : "/settings/developer/oauth";

  return (
    <div data-testid="oauth-clients-list" className="border-subtle rounded-lg border">
      {clients.map((client, index) => (
        <div
          key={client.clientId}
          data-testid={`oauth-client-list-item-${client.clientId}`}
          className={`flex items-stretch ${
            index !== clients.length - 1 ? "border-subtle border-b" : ""
          }`}>
          <div
            className="hover:bg-subtle flex flex-1 cursor-pointer items-center justify-between p-4 transition-colors"
            onClick={() => onSelectClient(client)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectClient(client);
              }
            }}>
            <div className="flex items-center gap-4">
              <Avatar
                alt={client.name}
                imageSrc={client.logo || undefined}
                fallback={<KeyIcon className="text-subtle h-6 w-6" />}
                size="md"
              />
              <div>
                <div className="text-emphasis font-medium">{client.name}</div>
                {client.user?.email && <div className="text-subtle text-sm">{client.user.email}</div>}
              </div>
            </div>
            {showStatus && client.status ? (
              <div className="flex items-center">{getStatusBadge(client.status, t)}</div>
            ) : null}
          </div>
          <button
            className="border-subtle hover:bg-subtle text-subtle hover:text-emphasis flex cursor-pointer items-center gap-1.5 border-l px-4 text-sm font-medium transition-colors"
            data-testid={`oauth-client-users-${client.clientId}`}
            onClick={() => router.push(`${basePath}/${client.clientId}/users`)}>
            <UsersIcon className="h-4 w-4" />
            {t("users")}
          </button>
          <button
            className="border-subtle hover:bg-subtle text-subtle hover:text-emphasis flex cursor-pointer items-center gap-1.5 border-l px-4 text-sm font-medium transition-colors"
            onClick={() => onSelectClient(client)}>
            <SettingsIcon className="h-4 w-4" />
            {t("settings")}
          </button>
        </div>
      ))}
    </div>
  );
};
