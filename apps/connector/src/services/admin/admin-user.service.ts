import { UserRepository } from "@/repositories/user.repository";
import type { PaginationQuery } from "@/types";

import type { PrismaClient } from "@calcom/prisma/client";
import type { User, Prisma, UserPermissionRole } from "@calcom/prisma/client";

import { BaseService } from "../base.service";

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: UserPermissionRole;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserPermissionRole;
  image?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  role: UserPermissionRole;
  emailVerified: Date | null;
  createdAt: Date;
}

export class AdminUserService extends BaseService {
  private userRepository: UserRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.userRepository = new UserRepository(prisma);
  }

  async getUserById(id: number): Promise<UserResponse> {
    this.logOperation("getUserById", { id });

    try {
      const user = await this.userRepository.findByIdOrThrow(id);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("getUserById", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<UserResponse | null> {
    this.logOperation("getUserByEmail", { email });

    try {
      const user = await this.userRepository.findByEmail(email.toLowerCase());
      return user ? this.mapUserToResponse(user) : null;
    } catch (error) {
      this.logError("getUserByEmail", error);
      throw error;
    }
  }

  async getUsers(filters: Prisma.UserWhereInput = {}, pagination: PaginationQuery = {}) {
    this.logOperation("getUsers", { filters, pagination });

    try {
      const result = await this.userRepository.findMany(filters, pagination);

      return {
        data: result.data.map((user: any) => this.mapUserToResponse(user)),
        pagination: result.pagination,
      };
    } catch (error) {
      this.logError("getUsers", error);
      throw error;
    }
  }

  async userExists(id: number): Promise<boolean> {
    try {
      return await this.userRepository.exists(id);
    } catch (error) {
      this.logError("userExists", error);
      throw error;
    }
  }

  private mapUserToResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdDate,
    };
  }
}
