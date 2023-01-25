import { Prisma, PrismaClient } from "@prisma/client";

export function addPrismaExtensions(prisma: PrismaClient) {
  const xprisma = prisma.$extends({
    model: {
      /**
       * We extend deployment model since it's supposed to be a single record table.
       * New settings should be added as Columns as needed.
       * */
      deployment: {
        /**
         * This is the preferred method for accessing deployment settings,
         * it can be called without any arguments:
         * @example
         * ```
         * const deployment = await prisma.deployment.get();
         * ```
         */
        async get(args?: Omit<Prisma.DeploymentFindUniqueArgs, "where">) {
          return prisma.deployment.findUnique({ where: { id: 1 }, ...args });
        },
        async findFirst(args: Omit<Prisma.DeploymentFindFirstArgs, "where">) {
          return prisma.deployment.findFirst({ where: { id: 1 }, ...args });
        },
        async findFirstOrThrow(args: Omit<Prisma.DeploymentFindFirstOrThrowArgs, "where">) {
          return prisma.deployment.findFirstOrThrow({ where: { id: 1 }, ...args });
        },
        async findUnique(args: Omit<Prisma.DeploymentFindUniqueArgs, "where">) {
          return prisma.deployment.findUnique({ where: { id: 1 }, ...args });
        },
        async findUniqueOrThrow(args: Omit<Prisma.DeploymentFindUniqueOrThrowArgs, "where">) {
          return prisma.deployment.findUniqueOrThrow({ where: { id: 1 }, ...args });
        },
        async upsert(args: Omit<Prisma.DeploymentUpsertArgs, "where">) {
          return prisma.deployment.upsert({ where: { id: 1 }, ...args });
        },
        async update(args: Omit<Prisma.DeploymentUpdateArgs, "where">) {
          return prisma.deployment.update({ where: { id: 1 }, ...args });
        },
        async findMany() {
          throw new Error("Use prisma.deployment.get method");
        },
        async updateMany() {
          throw new Error("Use prisma.deployment.update method");
        },
        async create() {
          throw new Error("Use prisma.deployment.upsert method");
        },
        async createMany() {
          throw new Error("Use prisma.deployment.upsert method");
        },
        async delete() {
          throw new Error("Deployment shouldn't be deleted");
        },
        async deleteMany() {
          throw new Error("Deployment shouldn't be deleted");
        },
      },
    },
  });
  return xprisma;
}
