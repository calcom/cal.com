import { prisma } from "@calcom/prisma";

import type { TUserWithEmailInputSchema } from "./userWithEmail.schema";

type UserWithEmailOptions = {
  input: TUserWithEmailInputSchema;
};

export const userWithEmailHandler = async ({ input }: UserWithEmailOptions) => {
  const { userEmail, email } = input;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        {
          secondaryEmails: {
            some: {
              email,
              emailVerified: {
                not: null,
              },
            },
          },
        },
      ],
    },
    select: {
      email: true,
    },
  });

  if (user && userEmail) return user.email === userEmail;
  return !user;
};

export default userWithEmailHandler;
