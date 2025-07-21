import prisma from "@calcom/prisma";

import type { UserList } from "../types/user";

/*
 * Extracts usernames (@Example) and emails (hi@example.com) from a string
 */
export const extractUsers = async (text: string) => {
  const usernames = text
    .match(/(?<![a-zA-Z0-9_.])@[a-zA-Z0-9_]+/g)
    ?.map((username) => username.slice(1).toLowerCase());
  const emails = text
    .match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g)
    ?.map((email) => email.toLowerCase());

  const dbUsersFromUsernames = usernames
    ? await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
        },
        where: {
          username: {
            in: usernames,
          },
        },
      })
    : [];

  const usersFromUsernames = usernames
    ? usernames.map((username) => {
        const user = dbUsersFromUsernames.find((u) => u.username === username);
        return user
          ? {
              username,
              id: user.id,
              email: user.email,
              type: "fromUsername",
            }
          : {
              username,
              id: null,
              email: null,
              type: "fromUsername",
            };
      })
    : [];

  const dbUsersFromEmails = emails
    ? await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
        },
        where: {
          email: {
            in: emails,
          },
        },
      })
    : [];

  const usersFromEmails = emails
    ? emails.map((email) => {
        const user = dbUsersFromEmails.find((u) => u.email === email);
        return user
          ? {
              email,
              id: user.id,
              username: user.username,
              type: "fromEmail",
            }
          : {
              email,
              id: null,
              username: null,
              type: "fromEmail",
            };
      })
    : [];

  return [...usersFromUsernames, ...usersFromEmails] as UserList;
};
