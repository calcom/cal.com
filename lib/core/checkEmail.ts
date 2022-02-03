import prisma from "@lib/prisma";

export async function checkEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
    },
  });

  if (user) {
    return {
      available: false as const,
      message: "A user exists with that email",
    };
  }
  return {
    available: true as const,
  };
}
