import type { PrismaApiKeyRepository } from "../repositories/PrismaApiKeyRepository";

type Deps = {
  apiKeyRepo: PrismaApiKeyRepository;
};

interface VerifyKeyResult {
  valid: boolean;
  error?: string;
  userId?: number;
  user?: {
    role: string;
    locked: boolean;
    email: string;
  };
}

export class ApiKeyService {
  constructor(private readonly deps: Deps) {}

  async verifyKeyByHashedKey(hashedKey: string): Promise<VerifyKeyResult> {
    const apiKey = await this.deps.apiKeyRepo.findByHashedKey(hashedKey);

    if (!apiKey) {
      return { valid: false, error: "Your API key is not valid." };
    }

    if (apiKey.expiresAt && this.isExpired(apiKey.expiresAt)) {
      return { valid: false, error: "This API key is expired." };
    }

    if (!apiKey.userId || !apiKey.user) {
      return { valid: false, error: "No user found for this API key." };
    }

    return {
      valid: true,
      userId: apiKey.userId,
      user: apiKey.user,
    };
  }

  private isExpired(expiresAt: Date): boolean {
    const now = new Date();
    return now.setHours(0, 0, 0, 0) > expiresAt.setHours(0, 0, 0, 0);
  }
}
