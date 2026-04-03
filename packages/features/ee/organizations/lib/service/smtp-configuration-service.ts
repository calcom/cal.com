import type { SecretEnvelopeV1 } from "@calcom/lib/crypto/keyring";
import { decryptSecret, encryptSecret } from "@calcom/lib/crypto/keyring";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { TFunction } from "i18next";
import type {
  CreateSmtpConfigurationInput,
  SmtpConfigurationPublic,
  PrismaSmtpConfigurationRepository,
  SmtpConfigurationWithCredentials,
} from "../../repositories/prisma-smtp-configuration-repository";
import type { SmtpService } from "./smtp-service";

const SMTP_KEYRING = "SMTP" as const;

export interface CreateSmtpConfigurationParams {
  teamId: number;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
}

export interface SmtpEmailConfig {
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
}

export interface ISmtpConfigurationServiceDeps {
  repository: PrismaSmtpConfigurationRepository;
  smtpService: SmtpService;
}

export class SmtpConfigurationService {
  constructor(private readonly deps: ISmtpConfigurationServiceDeps) {}

  private get repository(): PrismaSmtpConfigurationRepository {
    return this.deps.repository;
  }

  private get smtpService(): SmtpService {
    return this.deps.smtpService;
  }

  private encryptCredentials(
    user: string,
    password: string,
    teamId: number
  ): { user: string; password: string } {
    const aad = { teamId };
    return {
      user: JSON.stringify(encryptSecret({ ring: SMTP_KEYRING, plaintext: user, aad })),
      password: JSON.stringify(encryptSecret({ ring: SMTP_KEYRING, plaintext: password, aad })),
    };
  }

  private decryptCredentials(
    encryptedUser: string,
    encryptedPassword: string,
    teamId: number
  ): { user: string; password: string } {
    const aad = { teamId };
    return {
      user: decryptSecret({ envelope: JSON.parse(encryptedUser) as SecretEnvelopeV1, aad }),
      password: decryptSecret({ envelope: JSON.parse(encryptedPassword) as SecretEnvelopeV1, aad }),
    };
  }

  async create(params: CreateSmtpConfigurationParams): Promise<SmtpConfigurationPublic> {
    const isOrg = await this.repository.isOrganization(params.teamId);
    if (!isOrg) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "SMTP configuration is only available for organizations");
    }

    const existing = await this.repository.findByTeamId(params.teamId);
    if (existing) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        "Organization already has an SMTP configuration. Please delete the existing one first."
      );
    }

    const encrypted = this.encryptCredentials(params.smtpUser, params.smtpPassword, params.teamId);

    const input: CreateSmtpConfigurationInput = {
      teamId: params.teamId,
      fromEmail: params.fromEmail,
      fromName: params.fromName,
      smtpHost: params.smtpHost,
      smtpPort: params.smtpPort,
      smtpUser: encrypted.user,
      smtpPassword: encrypted.password,
      smtpSecure: params.smtpSecure,
    };

    const config = await this.repository.create(input);
    return this.toPublic(config);
  }

  async delete(teamId: number): Promise<void> {
    const config = await this.repository.findByTeamId(teamId);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }

    await this.repository.delete(teamId);
  }

  async getByOrgId(teamId: number): Promise<SmtpConfigurationPublic | null> {
    return this.repository.findByTeamId(teamId);
  }

  async getDecryptedConfigForOrg(teamId: number): Promise<SmtpEmailConfig | null> {
    const config = await this.repository.findByTeamIdWithCredentials(teamId);
    if (!config) {
      return null;
    }

    const { user, password } = this.decryptCredentials(config.smtpUser, config.smtpPassword, config.teamId);

    return {
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: user,
      smtpPassword: password,
      smtpSecure: config.smtpSecure,
    };
  }

  async update(
    teamId: number,
    params: {
      fromEmail?: string;
      fromName?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      smtpSecure?: boolean;
    }
  ): Promise<SmtpConfigurationPublic> {
    const existing = await this.repository.findByTeamId(teamId);
    if (!existing) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }

    const updateData: {
      fromEmail?: string;
      fromName?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      smtpSecure?: boolean;
    } = {};

    if (params.fromEmail !== undefined) updateData.fromEmail = params.fromEmail;
    if (params.fromName !== undefined) updateData.fromName = params.fromName;
    if (params.smtpHost !== undefined) updateData.smtpHost = params.smtpHost;
    if (params.smtpPort !== undefined) updateData.smtpPort = params.smtpPort;
    if (params.smtpUser !== undefined) {
      updateData.smtpUser = JSON.stringify(
        encryptSecret({ ring: SMTP_KEYRING, plaintext: params.smtpUser, aad: { teamId } })
      );
    }
    if (params.smtpPassword !== undefined) {
      updateData.smtpPassword = JSON.stringify(
        encryptSecret({ ring: SMTP_KEYRING, plaintext: params.smtpPassword, aad: { teamId } })
      );
    }
    if (params.smtpSecure !== undefined) updateData.smtpSecure = params.smtpSecure;

    const updated = await this.repository.update(teamId, updateData);
    return this.toPublic(updated);
  }

  async sendTestEmail(
    teamId: number,
    toEmail: string,
    language: TFunction
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.repository.findByTeamIdWithCredentials(teamId);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }

    const { user, password } = this.decryptCredentials(config.smtpUser, config.smtpPassword, config.teamId);

    return this.smtpService.sendTestEmail({
      config: {
        host: config.smtpHost,
        port: config.smtpPort,
        user,
        password,
        secure: config.smtpSecure,
      },
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      toEmail,
      language,
    });
  }

  private toPublic(config: SmtpConfigurationWithCredentials): SmtpConfigurationPublic {
    const { smtpPassword: _p, smtpUser: _u, ...publicFields } = config;
    return publicFields;
  }
}
