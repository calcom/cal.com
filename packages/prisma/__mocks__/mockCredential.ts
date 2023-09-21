import type { Credential } from "@prisma/client";

export const mockCredential = ({
  type,
  key,
  userId,
  appId,
  teamId = 1,
}: {
  type: string;
  key: object;
  userId: number;
  appId: string;
  teamId?: number;
}) => {
  return {
    id: 1,
    type,
    userId,
    teamId,
    key,
    appId,
    invalid: false,
    user: {
      email: "user@example.com",
    },
  } as Credential & { user: { email: string } };
};
