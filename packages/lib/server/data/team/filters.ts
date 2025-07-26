export type TeamFilter = {
  id?: number;
  slug?: string;
  parentId?: number;
  parentSlug?: string | null;
  isOrganization?: boolean;
  havingMemberWithId?: number;
};
