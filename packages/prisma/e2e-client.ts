import { getPrismaClient } from "./store/prismaStore";

export const prismaClientForTest = getPrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
