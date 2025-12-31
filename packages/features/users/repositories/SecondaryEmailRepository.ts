import type { PrismaClient } from "@calcom/prisma";

export class SecondaryEmailRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findUserIdsByEmail(email: string): Promise<number[]> {
    const secondaryEmails = await this.prismaClient.secondaryEmail.findMany({
      where: { email: email.toLowerCase() },
      select: { userId: true },
    });
    return secondaryEmails.map((se) => se.userId);
  }

  async findUserIdsByEmails(emails: string[]): Promise<number[]> {
    const normalizedEmails = emails.map((e) => e.toLowerCase());
    const secondaryEmails = await this.prismaClient.secondaryEmail.findMany({
      where: { email: { in: normalizedEmails } },
      select: { userId: true },
    });
    return secondaryEmails.map((se) => se.userId);
  }

  async findUserIdsByEmailDomain(domain: string): Promise<number[]> {
    const secondaryEmails = await this.prismaClient.secondaryEmail.findMany({
      where: { email: { endsWith: `@${domain.toLowerCase()}` } },
      select: { userId: true },
    });
    return secondaryEmails.map((se) => se.userId);
  }
}
