export const maskEmail = (organizerUser: { id: number; name: string | null }) => {
  const name = organizerUser?.name?.split(" ")[0] ?? "name";
  return `${name}-${organizerUser.id}@private.cal.com`;
};
