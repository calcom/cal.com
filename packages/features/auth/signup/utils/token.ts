import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { validateUsernameInTeam } from "@calcom/lib/validateUsername";
import { prisma } from "@calcom/prisma";

export async function findTokenByToken({ token }: { token: string }) {
  const foundToken = await prisma.verificationToken.findFirst({
    where: {
      token,
    },
    select: {
      id: true,
      expires: true,
      teamId: true,
    },
  });

  if (!foundToken) {
    throw new HttpError({
      statusCode: 401,
      message: "Invalid Token",
    });
  }

  return foundToken;
}

export function throwIfTokenExpired(expires?: Date) {
  if (!expires) return;
  if (dayjs(expires).isBefore(dayjs())) {
    throw new HttpError({
      statusCode: 401,
      message: "Token expired",
    });
  }
}

export async function validateUsernameForTeam({
  username,
  email,
  teamId,
}: {
  username: string;
  email: string;
  teamId: number | null;
}) {
  if (!teamId) return;
  const teamUserValidation = await validateUsernameInTeam(username, email, teamId);
  if (!teamUserValidation.isValid) {
    throw new HttpError({
      statusCode: 409,
      message: "Username or email is already taken",
    });
  }
}
