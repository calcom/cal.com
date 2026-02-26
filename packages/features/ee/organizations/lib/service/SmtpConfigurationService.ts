import type { SecretEnvelopeV1 } from "@calcom/lib/crypto/keyring";
import { decryptSecret, encryptSecret } from "@calcom/lib/crypto/keyring";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { TFunction } from "i18next";
import type {
  CreateSmtpConfigurationInput,
  SmtpConfigurationPublic,
  SmtpConfigurationRepository,
  SmtpConfigurationWithCredentials,
} from "../../repositories/SmtpConfigurationRepository";
import type { SmtpService } from "./SmtpService";

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
  repository: SmtpConfigurationRepository;
  smtpService: SmtpService;
}

export class SmtpConfigurationService {
  constructor(private readonly deps: ISmtpConfigurationServiceDeps) {}

  private get repository(): SmtpConfigurationRepository {
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
    const exists = await this.repository.existsByTeamId(params.teamId);
    if (exists) {
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

  async delete(id: number, teamId: number): Promise<void> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }
    if (config.teamId !== teamId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Not authorized to delete this SMTP configuration");
    }

    await this.repository.delete(id);
  }

  async listByOrganization(teamId: number): Promise<SmtpConfigurationPublic | null> {
    return this.repository.findByTeamId(teamId);
  }

  async getById(id: number, teamId: number): Promise<SmtpConfigurationPublic | null> {
    const config = await this.repository.findByIdPublic(id);
    if (!config || config.teamId !== teamId) {
      return null;
    }
    return config;
  }

  async getConfigForOrg(teamId: number): Promise<SmtpEmailConfig | null> {
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
    id: number,
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
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }
    if (existing.teamId !== teamId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Not authorized to update this SMTP configuration");
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
    if (params.smtpUser) {
      updateData.smtpUser = JSON.stringify(
        encryptSecret({ ring: SMTP_KEYRING, plaintext: params.smtpUser, aad: { teamId } })
      );
    }
    if (params.smtpPassword) {
      updateData.smtpPassword = JSON.stringify(
        encryptSecret({ ring: SMTP_KEYRING, plaintext: params.smtpPassword, aad: { teamId } })
      );
    }
    if (params.smtpSecure !== undefined) updateData.smtpSecure = params.smtpSecure;

    const updated = await this.repository.update(id, teamId, updateData);
    return this.toPublic(updated);
  }

  async sendTestEmail(
    id: number,
    teamId: number,
    toEmail: string,
    language: TFunction
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }
    if (config.teamId !== teamId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Not authorized to test this SMTP configuration");
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
