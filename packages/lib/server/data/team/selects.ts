export type TeamSelect = {
  id?: boolean;
  name?: boolean;
  slug?: boolean;
  logoUrl?: boolean;
  parentId?: boolean;
  metadata?: boolean;
  isOrganization?: boolean;
  organizationSettings?: boolean;
  isPlatform?: boolean;
  bio?: boolean;
  hideBranding?: boolean;
  hideBookATeamMember?: boolean;
  hideTeamProfileLink?: boolean;
  isPrivate?: boolean;
  bookingLimits?: boolean;
  rrResetInterval?: boolean;
  rrTimestampBasis?: boolean;
  includeManagedEventsInLimits?: boolean;
  theme?: boolean;
  brandColor?: boolean;
  darkBrandColor?: boolean;
  parent?: {
    select: {
      id?: boolean;
      slug?: boolean;
      name?: boolean;
      isPrivate?: boolean;
      isOrganization?: boolean;
      logoUrl?: boolean;
      metadata?: boolean;
      organizationSettings?: {
        select: {
          allowSEOIndexing?: boolean;
          orgProfileRedirectsToVerifiedDomain?: boolean;
          orgAutoAcceptEmail?: boolean;
        };
      };
    };
  };
  children?: {
    select: {
      name?: boolean;
      slug?: boolean;
    };
  };
  members?: {
    select: {
      accepted?: boolean;
      role?: boolean;
      disableImpersonation?: boolean;
      user?: any;
    };
  };
  eventTypes?: {
    where?: any;
    orderBy?: any;
    select: any;
  };
  inviteTokens?: {
    select: {
      token?: boolean;
      expires?: boolean;
      expiresInDays?: boolean;
      identifier?: boolean;
    };
  };
};

export const teamBasicSelect: TeamSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  parentId: true,
  metadata: true,
  isOrganization: true,
  organizationSettings: true,
  isPlatform: true,
};

export const teamBookingPageSelect: TeamSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bio: true,
  hideBranding: true,
  hideBookATeamMember: true,
  isPrivate: true,
  metadata: true,
  parent: {
    select: {
      id: true,
      slug: true,
      name: true,
      isPrivate: true,
      isOrganization: true,
      logoUrl: true,
      metadata: true,
    },
  },
};

export const teamWithMembersSelect: TeamSelect = {
  id: true,
  metadata: true,
  parentId: true,
  isOrganization: true,
  members: {
    select: {
      accepted: true,
    },
  },
};

export const teamWithOrganizationSettingsSelect: TeamSelect = {
  parent: {
    select: {
      isOrganization: true,
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
          orgProfileRedirectsToVerifiedDomain: true,
          orgAutoAcceptEmail: true,
        },
      },
    },
  },
};

export const teamForUserMembershipSelect: TeamSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  isOrganization: true,
  metadata: true,
  inviteTokens: {
    select: {
      token: true,
      expires: true,
      expiresInDays: true,
      identifier: true,
    },
  },
  parent: {
    select: {
      id: true,
      slug: true,
      name: true,
      isPrivate: true,
      isOrganization: true,
      logoUrl: true,
      metadata: true,
    },
  },
  parentId: true,
};
