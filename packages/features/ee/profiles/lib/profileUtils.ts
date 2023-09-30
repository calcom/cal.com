import type { User } from "next-auth";

import { parseOrgData } from "@calcom/features/ee/organizations/lib/orgDomains";

import type { Prisma } from ".prisma/client";

export function profileSelect() {
  const linkedUsers = {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          metadata: true,
        },
      },
    },
  };
  return {
    linkedBy: {
      select: {
        ...linkedUsers.select,
        linkedUsers,
      },
    },
    linkedUsers,
  };
}

export type LinkedUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  organization: {
    id: number;
    name: string;
    metadata: Prisma.JsonValue;
    slug: string | null;
  } | null;
};

export type LinkedUserData = {
  linkedBy:
    | ({
        linkedUsers: LinkedUser[];
      } & LinkedUser)
    | null;
  linkedUsers: LinkedUser[];
} | null;

export function parseProfileData(data: LinkedUserData, self: User) {
  const ids: number[] = [];
  const mapLinkedUser = (user: (LinkedUser & { org?: User["org"] }) | null) => {
    if (!user || ids.includes(user.id)) return [];
    ids.push(user.id);
    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        org: user.org || parseOrgData(user.organization),
        selected: user.id === self.id,
      },
    ];
  };
  return data?.linkedUsers
    .flatMap(mapLinkedUser)
    .concat(mapLinkedUser({ ...self, organization: null }))
    .concat(data.linkedBy?.linkedUsers.flatMap(mapLinkedUser) ?? [])
    .concat(mapLinkedUser(data.linkedBy));
}
