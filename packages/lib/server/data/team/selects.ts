export type TeamSelect = {
  id?: boolean;
  name?: boolean;
  slug?: boolean;
  logoUrl?: boolean;
  calVideoLogo?: boolean;
  appLogo?: boolean;
  appIconLogo?: boolean;
  bio?: boolean;
  hideBranding?: boolean;
  hideBookATeamMember?: boolean;
  hideTeamProfileLink?: boolean;
  isPrivate?: boolean;
  bannerUrl?: boolean;
  parentId?: boolean;
  metadata?: boolean;
  theme?: boolean;
  brandColor?: boolean;
  darkBrandColor?: boolean;
  rrResetInterval?: boolean;
  rrTimestampBasis?: boolean;
  bookingLimits?: boolean;
  includeManagedEventsInLimits?: boolean;
  isOrganization?: boolean;
  isPlatform?: boolean;
  pendingPayment?: boolean;
  smsLockState?: boolean;
  smsLockReviewedByAdmin?: boolean;
  createdByOAuthClientId?: boolean;
  timeFormat?: boolean;
  timeZone?: boolean;
  weekStart?: boolean;
  createdAt?: boolean;
  
  // Relations
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
          isOrganizationConfigured?: boolean;
          isOrganizationVerified?: boolean;
          orgAutoAcceptEmail?: boolean;
          lockEventTypeCreationForUsers?: boolean;
          adminGetsNoSlotsNotification?: boolean;
          isAdminReviewed?: boolean;
          isAdminAPIEnabled?: boolean;
          allowSEOIndexing?: boolean;
          orgProfileRedirectsToVerifiedDomain?: boolean;
          disablePhoneOnlySMSNotifications?: boolean;
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
      customRoleId?: boolean;
      customRole?: {
        select: {
          id?: boolean;
          name?: boolean;
          color?: boolean;
          description?: boolean;
        };
      };
      user?: {
        select: {
          id?: boolean;
          name?: boolean;
          email?: boolean;
          username?: boolean;
          avatarUrl?: boolean;
          timeZone?: boolean;
          locale?: boolean;
        };
      };
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
  
  organizationSettings?: {
    select: {
      isOrganizationConfigured?: boolean;
      isOrganizationVerified?: boolean;
      orgAutoAcceptEmail?: boolean;
      lockEventTypeCreationForUsers?: boolean;
      adminGetsNoSlotsNotification?: boolean;
      isAdminReviewed?: boolean;
      isAdminAPIEnabled?: boolean;
      allowSEOIndexing?: boolean;
      orgProfileRedirectsToVerifiedDomain?: boolean;
      disablePhoneOnlySMSNotifications?: boolean;
    };
  };
  
  // Additional relations with proper select objects
  orgUsers?: {
    select: {
      id?: boolean;
      name?: boolean;
      email?: boolean;
      username?: boolean;
      avatarUrl?: boolean;
    };
  };
  
  webhooks?: {
    select: {
      id?: boolean;
      subscriberUrl?: boolean;
      active?: boolean;
      eventTriggers?: boolean;
    };
  };
  
  routingForms?: {
    select: {
      id?: boolean;
      name?: boolean;
      description?: boolean;
      disabled?: boolean;
    };
  };
  
  apiKeys?: {
    select: {
      id?: boolean;
      note?: boolean;
      createdAt?: boolean;
      expiresAt?: boolean;
    };
  };
  
  credentials?: {
    select: {
      id?: boolean;
      type?: boolean;
      appId?: boolean;
      invalid?: boolean;
    };
  };
  
  accessCodes?: {
    select: {
      id?: boolean;
      code?: boolean;
      expiresAt?: boolean;
    };
  };
  
  instantMeetingTokens?: {
    select: {
      id?: boolean;
      token?: boolean;
      expires?: boolean;
    };
  };
  
  orgProfiles?: {
    select: {
      id?: boolean;
      uid?: boolean;
      username?: boolean;
    };
  };
  
  dsyncTeamGroupMapping?: {
    select: {
      id?: boolean;
      groupName?: boolean;
    };
  };
  
  platformOAuthClient?: {
    select: {
      id?: boolean;
      name?: boolean;
      redirectUris?: boolean;
    };
  };
  
  platformBilling?: {
    select: {
      customerId?: boolean;
      subscriptionId?: boolean;
      plan?: boolean;
      overdue?: boolean;
    };
  };
  
  activeOrgWorkflows?: {
    select: {
      workflowId?: boolean;
    };
  };
  
  attributes?: {
    select: {
      id?: boolean;
      name?: boolean;
      slug?: boolean;
      type?: boolean;
      enabled?: boolean;
    };
  };
  
  delegationCredentials?: {
    select: {
      id?: boolean;
      domain?: boolean;
      enabled?: boolean;
    };
  };
  
  domainWideDelegations?: {
    select: {
      id?: boolean;
      domain?: boolean;
      enabled?: boolean;
    };
  };
  
  roles?: {
    select: {
      id?: boolean;
      name?: boolean;
      color?: boolean;
      description?: boolean;
      type?: boolean;
    };
  };
  
  features?: {
    select: {
      featureId?: boolean;
      assignedAt?: boolean;
      assignedBy?: boolean;
    };
  };
  
  internalNotePresets?: {
    select: {
      id?: boolean;
      name?: boolean;
      cancellationReason?: boolean;
    };
  };
  
  creditBalance?: {
    select: {
      id?: boolean;
      additionalCredits?: boolean;
      limitReachedAt?: boolean;
      warningSentAt?: boolean;
    };
  };
  
  organizationOnboarding?: {
    select: {
      id?: boolean;
      orgOwnerEmail?: boolean;
      isComplete?: boolean;
      billingPeriod?: boolean;
      pricePerSeat?: boolean;
      seats?: boolean;
    };
  };
  
  managedOrganization?: {
    select: {
      managedOrganizationId?: boolean;
      createdAt?: boolean;
    };
  };
  
  managedOrganizations?: {
    select: {
      managedOrganizationId?: boolean;
      createdAt?: boolean;
    };
  };
  
  filterSegments?: {
    select: {
      id?: boolean;
      name?: boolean;
      tableIdentifier?: boolean;
      scope?: boolean;
      activeFilters?: boolean;
      sorting?: boolean;
      columnVisibility?: boolean;
      columnSizing?: boolean;
      perPage?: boolean;
      searchTerm?: boolean;
    };
  };
};
