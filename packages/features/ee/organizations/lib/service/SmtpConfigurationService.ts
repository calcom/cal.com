import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import type {
  CreateSmtpConfigurationInput,
  SmtpConfigurationPublic,
  SmtpConfigurationWithCredentials,
} from "../../repositories/SmtpConfigurationRepository";
import type { SmtpConfigurationRepository } from "../../repositories/SmtpConfigurationRepository";
import type { SmtpService } from "./SmtpService";

const REQUIRED_KEY_LENGTH = 32;

export interface CreateSmtpConfigurationParams {
  organizationId: number;
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

  private encryptCredentials(user: string, password: string): { user: string; password: string } {
    const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY || "";
    if (!encryptionKey) {
      throw new ErrorWithCode(ErrorCode.InternalServerError, "CALENDSO_ENCRYPTION_KEY not configured");
    }
    if (encryptionKey.length !== REQUIRED_KEY_LENGTH) {
      throw new ErrorWithCode(
        ErrorCode.InternalServerError,
        `CALENDSO_ENCRYPTION_KEY must be exactly ${REQUIRED_KEY_LENGTH} characters`
      );
    }
    return {
      user: symmetricEncrypt(user, encryptionKey),
      password: symmetricEncrypt(password, encryptionKey),
    };
  }

  private decryptCredentials(
    encryptedUser: string,
    encryptedPassword: string
  ): { user: string; password: string } {
    const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY || "";
    if (!encryptionKey) {
      throw new ErrorWithCode(ErrorCode.InternalServerError, "CALENDSO_ENCRYPTION_KEY not configured");
    }
    if (encryptionKey.length !== REQUIRED_KEY_LENGTH) {
      throw new ErrorWithCode(
        ErrorCode.InternalServerError,
        `CALENDSO_ENCRYPTION_KEY must be exactly ${REQUIRED_KEY_LENGTH} characters`
      );
    }
    return {
      user: symmetricDecrypt(encryptedUser, encryptionKey),
      password: symmetricDecrypt(encryptedPassword, encryptionKey),
    };
  }

  async create(params: CreateSmtpConfigurationParams): Promise<SmtpConfigurationPublic> {
    const exists = await this.repository.existsByOrgAndEmail(params.organizationId, params.fromEmail);
    if (exists) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "SMTP configuration already exists for this email");
    }

    const existingCount = await this.repository.countByOrgId(params.organizationId);
    const isFirstConfig = existingCount === 0;

    const encrypted = this.encryptCredentials(params.smtpUser, params.smtpPassword);

    const input: CreateSmtpConfigurationInput = {
      organizationId: params.organizationId,
      fromEmail: params.fromEmail,
      fromName: params.fromName,
      smtpHost: params.smtpHost,
      smtpPort: params.smtpPort,
      smtpUser: encrypted.user,
      smtpPassword: encrypted.password,
      smtpSecure: params.smtpSecure,
      isPrimary: isFirstConfig,
    };

    const config = await this.repository.create(input);

    return this.toPublic(config);
  }

  async setAsPrimary(id: number, organizationId: number): Promise<void> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }
    if (config.organizationId !== organizationId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Not authorized to update this SMTP configuration");
    }

    await this.repository.setAsPrimary(id, organizationId);
  }

  async delete(id: number, organizationId: number): Promise<void> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }
    if (config.organizationId !== organizationId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Not authorized to delete this SMTP configuration");
    }

    await this.repository.delete(id);
  }

  async toggleEnabled(
    id: number,
    organizationId: number,
    isEnabled: boolean
  ): Promise<SmtpConfigurationPublic> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new ErrorWithCode(ErrorCode.NotFound, "SMTP configuration not found");
    }
    if (config.organizationId !== organizationId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Not authorized to update this SMTP configuration");
    }

    const updated = await this.repository.setEnabled(id, isEnabled);
    return this.toPublic(updated);
  }

  async listByOrganization(organizationId: number): Promise<SmtpConfigurationPublic[]> {
    return this.repository.findByOrgId(organizationId);
  }

  async getById(id: number, organizationId: number): Promise<SmtpConfigurationPublic | null> {
    const config = await this.repository.findByIdPublic(id);
    if (!config || config.organizationId !== organizationId) {
      return null;
    }
    return config;
  }

  async getActiveConfigForOrg(organizationId: number): Promise<SmtpEmailConfig | null> {
    const config = await this.repository.findPrimaryActiveByOrgId(organizationId);
    if (!config) {
      return null;
    }

    const { user, password } = this.decryptCredentials(config.smtpUser, config.smtpPassword);

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

  private toPublic(config: SmtpConfigurationWithCredentials): SmtpConfigurationPublic {
    const { smtpUser: _u, smtpPassword: _p, ...publicFields } = config;
    return publicFields as SmtpConfigurationPublic;
  }
}
