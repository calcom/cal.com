export const getRoutedTeamMemberIdsFromSearchParams = (searchParams: URLSearchParams) => {
  const routedTeamMemberIdsParam = searchParams.get("cal.routedTeamMemberIds");
  const routedTeamMemberIds =
    typeof routedTeamMemberIdsParam === "string"
      ? routedTeamMemberIdsParam
          .split(",")
          .filter(Boolean)
          .map((id) => parseInt(id, 10))
      : null;
  return routedTeamMemberIds;
};
