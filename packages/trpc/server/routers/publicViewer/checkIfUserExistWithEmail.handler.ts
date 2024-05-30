import { prisma } from "@calcom/prisma";

import type { TUserWithEmailInputSchema } from "./checkIfUserExistWithEmail.schema";

type UserWithEmailOptions = {
  input: TUserWithEmailInputSchema;
};

// Function to extract base email
const extractBaseEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  const baseLocalPart = localPart.split("+")[0];
  return `${baseLocalPart}@${domain}`;
};

export const userWithEmailHandler = async ({ input }: UserWithEmailOptions) => {
  const { userSessionEmail, email } = input;
  const baseEmail = extractBaseEmail(email);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: baseEmail,
          emailVerified: {
            not: null,
          },
        },
        {
          secondaryEmails: {
            some: {
              email: baseEmail,
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

  if (user && userSessionEmail) return user.email === userSessionEmail;
  return !user;
};

export default userWithEmailHandler;
