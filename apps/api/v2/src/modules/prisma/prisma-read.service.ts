import type { OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient, Prisma } from "@prisma/client";

@Injectable()
export class PrismaReadService implements OnModuleInit {
  public prisma: ExtendedPrismaClient;

  constructor(private readonly configService: ConfigService) {
    const dbUrl = configService.get("db.readUrl", { infer: true });

    this.prisma = getExtendedPrismaClient(dbUrl);
  }

  async onModuleInit() {
    this.prisma.$connect();
  }
}

type ExtendedPrismaClient = ReturnType<typeof getExtendedPrismaClient>;

function getExtendedPrismaClient(dbUrl: string) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  const extendedPrisma = prisma.$extends({
    name: "exclude-user-password",
    query: {
      user: {
        async findUnique({ args, query }) {
          const withoutPassword = excludePassword(args) as Prisma.UserFindUniqueArgs;
          return query(withoutPassword);
        },
        async findFirst({ args, query }) {
          const withoutPassword = excludePassword(args);
          return query(withoutPassword);
        },
        async findMany({ args, query }) {
          const withoutPassword = excludePassword(args);
          return query(withoutPassword);
        },
      },
    },
  });

  return extendedPrisma;
}

function excludePassword(
  args: Prisma.UserFindUniqueArgs | Prisma.UserFindFirstArgs | Prisma.UserFindManyArgs
) {
  const argsCopy = { ...args };

  if (argsCopy.select?.password !== true) {
    argsCopy.select = { ...argsCopy.select, password: false };
  }

  return argsCopy;
}
