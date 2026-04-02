import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { NextAuthPassportStrategy } from "@/lib/passport/strategies/types";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class NextAuthMockStrategy extends PassportStrategy(NextAuthPassportStrategy, "next-auth") {
  constructor(
    private readonly email: string,
    private readonly userRepository: UsersRepository
  ) {
    super();
  }
  async authenticate() {
    try {
      const user = await this.userRepository.findByEmailWithProfile(this.email);
      if (!user) {
        throw new Error("User with the provided email not found");
      }

      return this.success(user);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) return this.error(error);
    }
  }
}
