import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

export async function checkRegularUsername(_username: string) {
  const username = slugify(_username);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
    },
  });

  if (user) {
    return {
      available: false as const,
      message: "A user exists with that username",
    };
  }
  return {
    available: true as const,
  };
}
