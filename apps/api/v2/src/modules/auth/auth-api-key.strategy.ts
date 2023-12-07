import type { ApiKeyService } from "@/modules/api-key/api-key.service";
import type { UserRepository } from "@/modules/repositories/user/user-repository.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
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
    const apiKey = await this.apiKeyService.retrieveApiKey(req);
    if (!apiKey) {
      throw new UnauthorizedException();
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new Error("This apiKey is expired");
    }

    const user = await this.userRepository.findById(apiKey.userId);
    this.success(user);
  }
}
