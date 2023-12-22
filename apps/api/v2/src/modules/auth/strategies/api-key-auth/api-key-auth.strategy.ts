import { UserRepository } from "@/modules/repositories/user/user.repository";
import { ApiKeyService } from "@/modules/services/api-key/api-key.service";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";

class BaseStrategy {
  success!: (user: unknown) => void;
  error!: (error: Error) => void;
}

@Injectable()
export class ApiKeyAuthStrategy extends PassportStrategy(BaseStrategy, "api-key") {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly userRepository: UserRepository
  ) {
    super();
  }

  async authenticate(req: Request) {
    try {
      const apiKey = await this.apiKeyService.retrieveApiKey(req);

      if (!apiKey) {
        throw new UnauthorizedException();
      }

      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        throw new Error("This apiKey is expired");
      }

      const user = await this.userRepository.findById(apiKey.userId);
      if (!user) {
        throw new NotFoundException("User not found");
      }

      this.success(user);
    } catch (error) {
      if (error instanceof Error) return this.error(error);
    }
  }
}
