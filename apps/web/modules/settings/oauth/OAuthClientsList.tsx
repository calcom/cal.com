"use client";

import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

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

  return (
    <div className="border-subtle rounded-lg border" data-testid="oauth-clients-list">
      {clients.map((client, index) => (
        <div
          key={client.clientId}
          data-testid={`oauth-client-list-item-${client.clientId}`}
          className={`hover:bg-subtle flex cursor-pointer items-center justify-between p-4 transition-colors ${
            index !== clients.length - 1 ? "border-subtle border-b" : ""
          }`}
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
              fallback={<Icon name="key" className="text-subtle h-6 w-6" />}
              size="md"
            />
            <div>
              <div className="text-emphasis font-medium">{client.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {showStatus && client.status ? getStatusBadge(client.status, t) : null}
            <Icon name="chevron-right" className="text-subtle h-5 w-5" />
          </div>
        </div>
      ))}
    </div>
  );
};
