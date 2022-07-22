import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

export async function checkRegularUsername(_username: string) {
  const username = slugify(_username);
  const premium = !!process.env.NEXT_PUBLIC_IS_E2E && username.length < 5;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
    },
  });

  if (user) {
    return {
      available: false as const,
      premium,
      message: "A user exists with that username",
    };
  }
  return {
    available: true as const,
    premium,
  };
}
