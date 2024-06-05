import { BaseStrategy } from "@/lib/passport/strategies/types";
import { ApiKeyService } from "@/modules/api-key/api-key.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";

@Injectable()
export class ApiKeyAuthStrategy extends PassportStrategy(BaseStrategy, "api-key") {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly userRepository: UsersRepository
  ) {
    super();
  }

  async authenticate(req: Request) {
    try {
      const apiKey = await this.apiKeyService.retrieveApiKey(req);

      if (!apiKey) {
        throw new UnauthorizedException("Authorization token is missing.");
      }

      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        throw new UnauthorizedException("The API key is expired.");
      }

      const user = await this.userRepository.findById(apiKey.userId);
      if (!user) {
        throw new NotFoundException("User not found.");
      }

      this.success(user);
    } catch (error) {
      if (error instanceof Error) return this.error(error);
    }
  }
}
