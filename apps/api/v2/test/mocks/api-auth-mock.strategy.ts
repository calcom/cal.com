import { BaseStrategy } from "@/lib/passport/strategies/types";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

@Injectable()
export class ApiAuthMockStrategy extends PassportStrategy(BaseStrategy, "api-auth") {
  constructor(private readonly email: string, private readonly usersRepository: UsersRepository) {
    super();
  }

  async authenticate() {
    try {
      const user = await this.usersRepository.findByEmailWithProfile(this.email);
      if (!user) {
        throw new Error("User with the provided ID not found");
      }

      return this.success(user);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) return this.error(error);
    }
  }
}
