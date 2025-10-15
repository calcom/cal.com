export const getValidatedTeamSubscriptionIdForPlatform = (subscriptionId?: string | null) => {
  if (!subscriptionId) {
    return null;
  }

  return subscriptionId;
};
