import type { CredentialForCalendarService } from "@calcom/types/Credential";

type QualifiedHost = {
  user: {
    id: number;
    credentials: CredentialForCalendarService[];
  };
  isFixed?: boolean;
  groupId?: string | null;
};

type QualifiedHostsResult = {
  qualifiedRRHosts: QualifiedHost[];
  allFallbackRRHosts: QualifiedHost[];
  fixedHosts: QualifiedHost[];
};

export type QualifiedHostsService = {
  findQualifiedHostsWithDelegationCredentials: (..._args: unknown[]) => Promise<QualifiedHostsResult>;
};

const noOpService: QualifiedHostsService = {
  findQualifiedHostsWithDelegationCredentials: async () => ({
    qualifiedRRHosts: [],
    allFallbackRRHosts: [],
    fixedHosts: [],
  }),
};

export function getQualifiedHostsService(): QualifiedHostsService {
  return noOpService;
}
