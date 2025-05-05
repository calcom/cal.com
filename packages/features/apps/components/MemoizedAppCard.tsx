import { memo } from "react";

import type { UserAdminTeams } from "@calcom/lib/server/repository/user";
import type { AppFrontendPayload } from "@calcom/types/App";
import type { CredentialFrontendPayload } from "@calcom/types/Credential";

import { AppCard } from "./AppCard";

type MemoizedAppCardProps = {
  app: AppFrontendPayload & { credentials?: CredentialFrontendPayload[] };
  searchText?: string;
  credentials?: CredentialFrontendPayload[];
  userAdminTeams?: UserAdminTeams;
};

export const MemoizedAppCard = memo(
  (props: MemoizedAppCardProps) => <AppCard {...props} />,
  (prevProps, nextProps) => {
    return (
      prevProps.app.slug === nextProps.app.slug &&
      prevProps.searchText === nextProps.searchText &&
      prevProps.credentials?.length === nextProps.credentials?.length
    );
  }
);

MemoizedAppCard.displayName = "MemoizedAppCard";
