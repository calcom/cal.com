export const getDynamicFixedHostUsernamesFromSearchParams = (searchParams: URLSearchParams) => {
  const rawValue = searchParams.get("fixed");
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.replace(/\s+/g, "+");
  const usernames = normalized
    .split("+")
    .map((username) => username.trim())
    .filter(Boolean);

  return usernames.length ? usernames : null;
};
