import { UserRepository } from "@/modules/repositories/user/user-repository.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { getToken } from "next-auth/jwt";

class BaseStrategy {
  success!: (user: unknown) => void;
  error!: (error: Error) => void;
}

@Injectable()
export class NextAuthStrategy extends PassportStrategy(BaseStrategy, "next-auth") {
  constructor(private readonly userRepository: UserRepository, private readonly config: ConfigService) {
    super();
  }

  async authenticate(req: Request) {
    try {
      const nextAuthSecret = this.config.get("next.authSecret", { infer: true });
      const payload = await getToken({ req, secret: nextAuthSecret });

      if (!payload) {
        throw new UnauthorizedException();
      }

      const user = await this.userRepository.findByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException();
      }

      return this.success(user);
    } catch (error) {
      return this.error(error);
    }
  }
}
