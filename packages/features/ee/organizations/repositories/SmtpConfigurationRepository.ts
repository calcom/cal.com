import type { Prisma, PrismaClient } from "@calcom/prisma/client";

export interface CreateSmtpConfigurationInput {
  organizationId: number;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
}

const smtpConfigurationSelect = {
  id: true,
  organizationId: true,
  fromEmail: true,
  fromName: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  smtpSecure: true,
  lastTestedAt: true,
  lastError: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SmtpConfigurationSelect;

export type SmtpConfigurationWithCredentials = Prisma.SmtpConfigurationGetPayload<{
  select: typeof smtpConfigurationSelect;
}>;

const smtpConfigurationSelectPublic = {
  id: true,
  organizationId: true,
  fromEmail: true,
  fromName: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpSecure: true,
  lastTestedAt: true,
  lastError: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SmtpConfigurationSelect;

export type SmtpConfigurationPublic = Prisma.SmtpConfigurationGetPayload<{
  select: typeof smtpConfigurationSelectPublic;
}>;

export class SmtpConfigurationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateSmtpConfigurationInput): Promise<SmtpConfigurationWithCredentials> {
    return this.prisma.smtpConfiguration.create({
      data: {
        organizationId: data.organizationId,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUser: data.smtpUser,
        smtpPassword: data.smtpPassword,
        smtpSecure: data.smtpSecure,
      },
      select: smtpConfigurationSelect,
    });
  }

  async findById(id: number): Promise<SmtpConfigurationWithCredentials | null> {
    return this.prisma.smtpConfiguration.findUnique({
      where: { id },
      select: smtpConfigurationSelect,
    });
  }

  async findByIdPublic(id: number): Promise<SmtpConfigurationPublic | null> {
    return this.prisma.smtpConfiguration.findUnique({
      where: { id },
      select: smtpConfigurationSelectPublic,
    });
  }

  async findByOrgId(organizationId: number): Promise<SmtpConfigurationPublic[]> {
    return this.prisma.smtpConfiguration.findMany({
      where: { organizationId },
      select: smtpConfigurationSelectPublic,
      orderBy: { createdAt: "desc" },
    });
  }

  async findFirstEnabledByOrgId(organizationId: number): Promise<SmtpConfigurationWithCredentials | null> {
    return this.prisma.smtpConfiguration.findFirst({
      where: {
        organizationId,
        isEnabled: true,
      },
      select: smtpConfigurationSelect,
    });
  }

  async setEnabled(id: number, organizationId: number, isEnabled: boolean): Promise<SmtpConfigurationWithCredentials> {
    if (isEnabled) {
      await this.prisma.smtpConfiguration.updateMany({
        where: { organizationId, isEnabled: true },
        data: { isEnabled: false },
      });
    }
    return this.prisma.smtpConfiguration.update({
      where: { id },
      data: { isEnabled },
      select: smtpConfigurationSelect,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.smtpConfiguration.delete({
      where: { id },
    });
  }

  async existsByOrgAndEmail(organizationId: number, fromEmail: string): Promise<boolean> {
    const count = await this.prisma.smtpConfiguration.count({
      where: { organizationId, fromEmail },
    });
    return count > 0;
  }

  async countByOrgId(organizationId: number): Promise<number> {
    return this.prisma.smtpConfiguration.count({
      where: { organizationId },
    });
  }
}
