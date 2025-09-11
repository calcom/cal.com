import type { UserPaginationQuery } from "@/schema/user.schema";
import { NotFoundError } from "@/utils/error";

import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<User> {
  private oldUserRepo: OldUserRepository;
  constructor(prisma: PrismaClient) {
    super(prisma);
    this.oldUserRepo = new OldUserRepository(prisma);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: (data.role as UserPermissionRole) || ("USER" as UserPermissionRole),
          password: data.password,
          username: data.username,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "create user");
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find user by id");
    }
  }

  async findByIdOrThrow(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError("User");
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find user by email");
    }
  }

  async findMany(filters: Prisma.UserWhereInput = {}, pagination: UserPaginationQuery = {}) {
    const { username, name, email, role, emailVerified } = filters;

    const where: Prisma.UserWhereInput = {};

    if (username) {
      where.username = { contains: username as string, mode: "insensitive" };
    }

    if (name) {
      where.name = { contains: name as string, mode: "insensitive" };
    }

    if (email) {
      where.email = { contains: email as string, mode: "insensitive" };
    }

    if (role) {
      where.role = role;
    }

    if (typeof emailVerified === "boolean") {
      where.emailVerified = emailVerified ? { not: null } : null;
    }

    return this.executePaginatedQuery(
      pagination, // First parameter: pagination query
      (
        options // Second parameter: findManyFn
      ) =>
        this.prisma.user.findMany({
          where,
          ...options, // Use the options parameter instead of paginationOptions
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdDate: true,
            username: true,
          },
        }),
      () => this.prisma.user.count({ where }) // Third parameter: countFn
    );
  }

  async update(id: number | string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id: Number(id) },
        data,
      });
    } catch (error) {
      this.handleDatabaseError(error, "update user");
    }
  }

  async delete(id: number | string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id: Number(id) },
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete user");
    }
  }

  async toggleLock(id: number, lock: boolean): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { locked: lock },
      });
    } catch (error) {
      this.handleDatabaseError(error, "lock user");
    }
  }

  async exists(id: number | string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { id: Number(id) },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check user exists");
    }
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const where: any = { email };

      if (excludeUserId) {
        where.NOT = { id: excludeUserId };
      }

      const count = await this.prisma.user.count({ where });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check email exists");
    }
  }

  async findUsersByUsername({ orgSlug, usernameList }: { orgSlug: string | null; usernameList: string[] }) {
    const data = await this.oldUserRepo.findUsersByUsername({ orgSlug, usernameList });

    console.log("Data for username: ", data);

    return data;
  }

  async findPlatformMembersByUsernames({ usernameList }: { usernameList: string[] }) {
    return this.oldUserRepo.findPlatformMembersByUsernames({ usernameList });
  }
}