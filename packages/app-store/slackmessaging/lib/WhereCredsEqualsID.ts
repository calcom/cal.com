export const WhereCredsEqualsId = (userId: string) => ({
  where: {
    type: "slack_app",
    key: {
      path: ["authed_user", "id"],
      equals: userId,
    },
  },
});
