export const getUsernameList = (users: string | string[] | undefined): string[] => {
  // If users is undefined or a string, put it in an array; otherwise, use it as is.
  const normalizedUsers = typeof users === "undefined" ? [] : typeof users === "string" ? [users] : users;

  const allUsers = normalizedUsers.map((user) => user.replace(/( |%20|%2b)/g, "+").split("+")).flat();

  // !! return allUsers.map((userSlug) => slugify(userSlug));
  return allUsers;
};
