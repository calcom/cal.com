import { UserRepository } from "@/repositories/user.repository";
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import type { PaginationQuery } from "@/types";
import { ConflictError, ValidationError } from "@/utils/error";
import bcrypt from "bcryptjs";

import { PrismaClient } from "@calcom/prisma";
import type { User, Prisma, UserPermissionRole } from "@calcom/prisma/client";

import { BaseService } from "../base.service";
import z from "zod";
import zodToJsonSchema from 'zod-to-json-schema';
import { UserPaginationQuery, UserResponse } from "@/schema/user.schema";

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



export class UserService extends BaseService {
  private userRepository: UserRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.userRepository = new UserRepository(prisma);
  }

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    this.logOperation("createUser", { email: input.email, role: input.role });

    try {
      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(input.email);
      if (emailExists) {
        throw new ConflictError("Email already exists");
      }

      // Validate password
      if (!input.password || input.password.length < 8) {
        throw new ValidationError("Password must be at least 8 characters long");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      const userData: Prisma.UserCreateInput = {
        email: input.email.toLowerCase().trim(),
        name: input.name?.trim(),
        role: input.role || "USER",
        // Note: password field is not included in the repository create method
        // This might need to be handled differently based on your User model schema
      };

      const user = await this.userRepository.create(userData);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("createUser", error);
      throw error;
    }
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


  async getUserEventsByUsernameString(usernameString: string) {
    this.logOperation("getUsersByUsernameString", { usernameString });

    try {
      const usernameList = getUsernameList(usernameString);

      const usersInOrgContext = await this.getUsersInOrgContext(
        usernameList,
        null
      );
      return usersInOrgContext;
    } catch (error) {
      this.logError("getUsersByUsernameString", error);
      throw error;
    }
  }

  async getUsersInOrgContext(usernameList: string[], orgSlug: string | null) {
    const usersInOrgContext = await this.userRepository.findUsersByUsername({
      usernameList,
      orgSlug,
    });

    if (usersInOrgContext.length) {
      return usersInOrgContext;
    }

    // note(Lauris): platform members (people who run platform) are part of platform organization while
    // the platform organization does not have a domain. In this case there is no org domain but also platform member
    // "User.organization" is not null so "UserRepository.findUsersByUsername" returns empty array and we do this as a last resort
    // call to find platform member.
    return await this.userRepository.findPlatformMembersByUsernames({
      usernameList,
    });
  }




  async getUsers(filters: Prisma.UserWhereInput = {}, pagination: UserPaginationQuery = {}) {
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

  async updateUser(id: number, input: UpdateUserInput): Promise<UserResponse> {
    this.logOperation("updateUser", { id, ...input });

    try {
      // Check if user exists
      await this.userRepository.findByIdOrThrow(id);

      // Check if email is being changed and if it's already taken
      if (input.email) {
        const emailExists = await this.userRepository.emailExists(input.email.toLowerCase(), id.toString());
        if (emailExists) {
          throw new ConflictError("Email already exists");
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        ...input,
        email: input.email?.toLowerCase().trim(),
        name: input.name?.trim(),
      };

      const user = await this.userRepository.update(id, updateData);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("updateUser", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    this.logOperation("deleteUser", { id });

    try {
      // Check if user exists
      await this.userRepository.findByIdOrThrow(id);

      await this.userRepository.delete(id);
    } catch (error) {
      this.logError("deleteUser", error);
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