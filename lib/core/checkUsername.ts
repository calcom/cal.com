import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

export default async function checkUsername(_username: string) {
  const username = slugify(_username);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
    },
  });

  return Promise.resolve({
    status: !user ? 200 : 418,
    json: () =>
      Promise.resolve({
        available: !user,
        message: user ? "Username is not available" : "",
      }),
  });
}
