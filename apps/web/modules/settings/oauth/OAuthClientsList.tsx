"use client";

import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { ChevronRightIcon, KeyIcon, UsersIcon } from "@coss/ui/icons";

import type { OAuthClientDetails } from "./view/OAuthClientDetailsDialog";

import { useRouter } from "next/navigation";
import { Button } from "@calcom/ui/components/button";

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

  return (
    <div data-testid="oauth-clients-list">
      {clients.map((client, index) => (
    <div
      key={client.clientId}
      data-testid={`oauth-client-list-item-${client.clientId}`}
      className={`hover:bg-subtle flex items-center justify-between transition-colors ${
        index !== clients.length - 1 ? "border-subtle border-b" : ""
      }`}>
      
      {/* Área clicável — só nome e avatar */}
      <div
        className="flex flex-1 cursor-pointer items-center gap-4 p-4"
        onClick={() => onSelectClient(client)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectClient(client);
          }
        }}>
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

      {/* Badge + botões com divisórias */}
      <div className="border-subtle flex items-center border-l">
        {showStatus && client.status && (
          <div className="border-subtle border-r px-4">
            {getStatusBadge(client.status, t)}
          </div>
        )}

        <button
          className="border-subtle hover:bg-subtle flex items-center gap-2 border-r px-4 py-4 text-sm transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/settings/developer/oauth/${client.clientId}/users`);
          }}>
          <UsersIcon className="h-4 w-4" />
          {t("users")}
        </button>

        <button
          className="hover:bg-subtle flex items-center gap-2 px-4 py-4 text-sm transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSelectClient(client);
          }}>
          <ChevronRightIcon className="text-subtle h-4 w-4" />
          {t("settings")}
        </button>
      </div>
    </div>
      ))}
    </div>
  );
};
