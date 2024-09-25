const getNewWebhookUrl = (teamId?: number, platform?: boolean) => {
  if (platform) {
    return `webhooks/new${platform ? `?platform=${platform}` : ""}`;
  } else {
    return `webhooks/new${teamId ? `?teamId=${teamId}` : ""}`;
  }
};

export default getNewWebhookUrl;
