export type OrgProfile = {
  username: string;
  organizationId: number;
  organization: {
    id: number;
    slug: string | null;
    requestedSlug: string | null;
  };
} | null;
