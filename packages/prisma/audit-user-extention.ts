import { Prisma } from "@prisma/client";

export function userContext(userId: number) {
  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await prisma.$transaction([
              prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId.toString()}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    })
  );
}
