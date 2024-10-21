import prisma from "@calcom/prisma";

export const findContactOwnerInDb = async ({ email }: { email: string | null }) => {
  if (!email) return null;

  // 1. There could be virtual contact owners in Salesforce.
  // 2. Some people who might be real but don't have an account in our system.
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return user ?? null;
};

