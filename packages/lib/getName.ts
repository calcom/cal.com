// eslint-disable-next-line no-restricted-imports
import { capitalize } from "lodash";

import prisma from "@calcom/prisma";

import { randomString } from "./random";
import slugify from "./slugify";

export function getFullNameFromField(name: string): [string, string] {
  // If it's an email address
  if (name.includes("@")) {
    const username = name.split("@")[0];
    const parts = username.split(/[._\-]+/); // e.g., "john_doe" => ["john", "doe"]
    const words = parts.map((word) => capitalize(word));

    const firstName = words[0] || "";
    const lastName = words.length > 1 ? words.slice(1).join(" ") : "";

    return [firstName, lastName];
  }

  // If it's a proper name already
  const words = name.trim().split(/\s+/); // split by whitespace
  const firstName = words[0] || "";
  const lastName = words.length > 1 ? words.slice(1).join(" ") : "";

  return [firstName, lastName];
}

export function getUserNameFromField(name: string): string {
  const [firstName, lastName] = getFullNameFromField(name);
  if (!firstName && !lastName) {
    return "";
  }
  if (!lastName) {
    return firstName.toLowerCase().trim();
  }

  return [firstName.toLowerCase(), lastName.toLowerCase()].join("-").trim();
}

export const usernameSlugRandom = (username: string) =>
  `${slugify(username)}-${randomString(6).toLowerCase()}`;

export async function checkIfUserNameTaken(user: { name: string }) {
  const username = getUserNameFromField(user.name);
  const existingUserWithUsername = await prisma.user.findFirst({
    where: {
      username,
      organizationId: null,
    },
  });
  return { existingUserWithUsername, username };
}
