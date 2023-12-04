import { UserRepository } from "@/modules/repositories/user/user-repository.service";
import { Response } from "@/types";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { getToken } from "next-auth/jwt";

@Injectable()
export class NextAuthGuard implements CanActivate {
  constructor(private readonly userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token.email) {
      return false;
    }
    const user = await this.userRepository.findByEmail(token.email);
    if (!user) {
      return false;
    }
    response.locals.user = user;
    //    const token = req.cookies["next-auth.session-token"]
    // make a call to database with token.email
    // handle different guard, error if no token, error if user is not authorized, error if user does not exist

    return true;
  }
}
