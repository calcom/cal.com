const dSyncUserSelect = {
  id: true,
  email: true,
  username: true,
  organizationId: true,
  completedOnboarding: true,
  identityProvider: true,
  profiles: true,
  locale: true,
  password: {
    select: {
      hash: true,
    },
  },
};

export default dSyncUserSelect;
