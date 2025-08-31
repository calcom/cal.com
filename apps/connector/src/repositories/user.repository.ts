import type { PaginationQuery } from "@/types";
import { NotFoundError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma/client";
import type { Prisma, User, UserPermissionRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: (data.role as UserPermissionRole) || ("USER" as UserPermissionRole),
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

  async findMany(filters: Prisma.UserWhereInput = {}, pagination: PaginationQuery = {}) {
    const { email, role, emailVerified } = filters;

    const where: Prisma.UserWhereInput = {};

    if (email) {
      where.email = { contains: email as string, mode: "insensitive" };
    }

    if (role) {
      where.role = role;
    }

    if (typeof emailVerified === "boolean") {
      where.emailVerified = emailVerified ? { not: null } : null;
    }

    const paginationOptions = this.buildPaginationOptions(pagination);

    console.log("paginationOptions", paginationOptions);
    return this.executePaginatedQuery(
      () =>
        this.prisma.user.findMany({
          where,
          ...paginationOptions,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdDate: true,
          },
        }),
      () => this.prisma.user.count({ where }),
      pagination
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
}
