import { UserRepository } from "@/repositories/user.repository";
import type { UserResponse, updateUserBodySchema } from "@/schema/user.schema";
import type { PaginationQuery } from "@/types";
import { ConflictError } from "@/utils";
import type z from "zod";

import { hashPasswordWithSalt } from "@calcom/features/auth/lib/hashPassword";
import { checkIfUserNameTaken, usernameSlugRandom } from "@calcom/lib/getName";
import type { PrismaClient } from "@calcom/prisma/client";
import type { User, Prisma, UserPermissionRole } from "@calcom/prisma/client";

import { BaseService } from "../base.service";

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserPermissionRole;
  image?: string;
}
type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

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

  async createUser(input: {
    email: string;
    password: string;
    name: string;
    role: UserPermissionRole;
  }): Promise<UserResponse> {
    this.logOperation("createUser", { input });

    try {
      const { hash, salt } = hashPasswordWithSalt(input.password);

      const existingUser = await this.userRepository.findByEmail(input.email);
      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }

      const { existingUserWithUsername, username } = await checkIfUserNameTaken({
        name: input.name,
      });

      const user = await this.userRepository.create({
        ...input,
        username: existingUserWithUsername ? usernameSlugRandom(input.name) : username,
        password: {
          create: {
            hash,
            salt,
          },
        },
      });
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("createUser", error);
      throw error;
    }
  }

  // update user handler
  async updateUser(id: number, input: UpdateUserBody): Promise<UserResponse> {
    this.logOperation("updateUser", { id, input });

    const user = await this.userRepository.findByIdOrThrow(id);

    try {
      const payload: Prisma.UserUpdateInput = {};

      // Handle password update
      if (input.password) {
        const { hash, salt } = hashPasswordWithSalt(input.password);
        payload.password = { update: { hash, salt } };
      }

      // Handle username update
      if (input.username && input.username !== user.username) {
        const { existingUserWithUsername, username } = await checkIfUserNameTaken({
          name: input.username,
        });

        if (existingUserWithUsername) {
          throw new ConflictError("User with this username already exists");
        }

        payload.username = username;
        payload.name = input.name;
      } else if (input.name) {
        // name changed but username doesn’t need to
        payload.name = input.name;
      }

      // Copy remaining allowed fields (excluding password and name which we already handled)
      const { password, name, ...rest } = input;
      Object.assign(payload, rest);

      const updatedUser = await this.userRepository.update(id, payload);
      return this.mapUserToResponse(updatedUser);
    } catch (error) {
      this.logError("updateUser", error);
      throw error;
    }
  }

  async lockUser(id: number): Promise<void> {
    this.logOperation("lockUser", { id });
    try {
      await this.userRepository.toggleLock(id, true);
    } catch (error) {
      this.logError("lockUser", error);
      throw error;
    }
  }

  async unLockUser(id: number): Promise<void> {
    this.logOperation("unLockUser", { id });
    try {
      await this.userRepository.toggleLock(id, false);
    } catch (error) {
      this.logError("unLockUser", error);
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
      username: user.username,
    };
  }
}
