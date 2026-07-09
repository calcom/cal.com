import { NextAuthPassportStrategy } from "@/lib/passport/strategies/types";
import { isJwtIssuedBeforePasswordChange } from "@/modules/auth/strategies/is-jwt-issued-before-password-change";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { getToken } from "next-auth/jwt";

@Injectable()
export class NextAuthStrategy extends PassportStrategy(NextAuthPassportStrategy, "next-auth") {
  constructor(private readonly userRepository: UsersRepository, private readonly config: ConfigService) {
    super();
  }

  async authenticate(req: Request) {
    try {
      const nextAuthSecret = this.config.get("next.authSecret", { infer: true });
      const payload = await getToken({ req, secret: nextAuthSecret });

      if (!payload) {
        throw new UnauthorizedException("NextAuthStrategy - Authentication token is missing or invalid.");
      }

      if (!payload.email) {
        throw new UnauthorizedException("NextAuthStrategy - Email not found in the authentication token.");
      }

      // The NextAuth jwt callback marks revoked tokens with this sticky flag, which
      // survives the `iat` being rotated forward on session refresh. Honor it before
      // the raw-iat check below so a refreshed-but-revoked token cannot authenticate.
      if (payload.error === "SessionInvalidated") {
        throw new UnauthorizedException("NextAuthStrategy - Session was invalidated. Please sign in again.");
      }

      const user = await this.userRepository.findByEmailWithProfile(payload.email);
      if (!user) {
        throw new UnauthorizedException(
          "NextAuthStrategy - User associated with the authentication token email not found."
        );
      }

      // Defense in depth: the token subject (stable user id) must match the user resolved
      // by the token's (mutable) email. Otherwise a token carrying a stale email later
      // reused by another account could authenticate as — and be revocation-checked
      // against — the wrong user.
      if (payload.sub && Number(payload.sub) !== user.id) {
        throw new UnauthorizedException("NextAuthStrategy - Token subject does not match the resolved user.");
      }

      if (isJwtIssuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) {
        throw new UnauthorizedException(
          "NextAuthStrategy - Session was invalidated by a password change. Please sign in again."
        );
      }

      return this.success(user);
    } catch (error) {
      if (error instanceof Error) return this.error(error);
      return this.error(
        new InternalServerErrorException(
          "NextAuthStrategy - An error occurred while authenticating the request"
        )
      );
    }
  }
}
