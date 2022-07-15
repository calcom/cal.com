import prisma from "@lib/prisma";

async function deleteUser(userName: string) {
  await prisma.user.deleteMany({
    where: {
      AND: {
        username: {
          contains: userName,
        },
      },
    },
  });
}
async function globalTeardown(/* config: FullConfig */) {
  await deleteUser("routing_forms-e2e");
}

export default globalTeardown;
