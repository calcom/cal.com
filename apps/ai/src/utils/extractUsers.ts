/*
 * Extracts usernames (@Example) and emails (hi@example.com) from a string
 */
import type { UserList } from "../types/user";

export const extractUsers = async (text: string) => {
  const usernames = text.match(/@[a-zA-Z0-9_]+/g)?.map((username) => username.slice(1));
  const emails = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g);

  const userIdsFromUsernames = usernames
    ? (
        await prisma.user.findMany({
          select: {
            id: true,
            email: true,
          },
          where: {
            username: {
              in: usernames,
            },
          },
        })
      ).map((user, n) => ({ username: usernames[n] as string, id: user.id, email: user.email }))
    : [];

  const userIdsFromEmails = emails
    ? (
        await prisma.user.findMany({
          select: {
            id: true,
          },
          where: {
            email: {
              in: emails,
            },
          },
        })
      ).map((user, n) => ({ email: emails[n] as string, id: user.id }))
    : [];

  return [...userIdsFromUsernames, ...userIdsFromEmails] as UserList;
};
