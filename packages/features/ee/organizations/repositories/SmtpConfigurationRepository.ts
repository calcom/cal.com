import type { Prisma, PrismaClient } from "@calcom/prisma/client";

export interface CreateSmtpConfigurationInput {
  teamId: number;
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
  teamId: true,
  fromEmail: true,
  fromName: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  smtpSecure: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SmtpConfigurationSelect;

export type SmtpConfigurationWithCredentials = Prisma.SmtpConfigurationGetPayload<{
  select: typeof smtpConfigurationSelect;
}>;

const smtpConfigurationSelectPublic = {
  id: true,
  teamId: true,
  fromEmail: true,
  fromName: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
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
        teamId: data.teamId,
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

  async findByTeamId(teamId: number): Promise<SmtpConfigurationPublic | null> {
    return this.prisma.smtpConfiguration.findUnique({
      where: { teamId },
      select: smtpConfigurationSelectPublic,
    });
  }

  async findByTeamIdWithCredentials(teamId: number): Promise<SmtpConfigurationWithCredentials | null> {
    return this.prisma.smtpConfiguration.findUnique({
      where: { teamId },
      select: smtpConfigurationSelect,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.smtpConfiguration.delete({
      where: { id },
    });
  }

  async existsByTeamId(teamId: number): Promise<boolean> {
    const count = await this.prisma.smtpConfiguration.count({
      where: { teamId },
    });
    return count > 0;
  }

  async isOrganization(teamId: number): Promise<boolean> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { isOrganization: true },
    });
    return team?.isOrganization ?? false;
  }

  async update(
    id: number,
    teamId: number,
    data: {
      fromEmail?: string;
      fromName?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      smtpSecure?: boolean;
    }
  ): Promise<SmtpConfigurationWithCredentials> {
    const updateData: Prisma.SmtpConfigurationUpdateInput = {};
    if (data.fromEmail !== undefined) updateData.fromEmail = data.fromEmail;
    if (data.fromName !== undefined) updateData.fromName = data.fromName;
    if (data.smtpHost !== undefined) updateData.smtpHost = data.smtpHost;
    if (data.smtpPort !== undefined) updateData.smtpPort = data.smtpPort;
    if (data.smtpUser !== undefined) updateData.smtpUser = data.smtpUser;
    if (data.smtpPassword !== undefined) updateData.smtpPassword = data.smtpPassword;
    if (data.smtpSecure !== undefined) updateData.smtpSecure = data.smtpSecure;

    return this.prisma.smtpConfiguration.update({
      where: { id, teamId },
      data: updateData,
      select: smtpConfigurationSelect,
    });
  }
}
