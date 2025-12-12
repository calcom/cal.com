/**
 * ORM-agnostic interface for AttributeToUserRepository
 * This interface defines the contract for attribute-to-user mapping data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { JsonValue } from "@calcom/prisma/client";

export interface AttributeToUserDto {
  id: number;
  memberId: number;
  attributeOptionId: string;
}

export interface AttributeToUserWithAttributeDto {
  id: number;
  memberId: number;
  attributeOptionId: string;
  attributeOption: {
    attribute: {
      id: string;
      name: string;
      slug: string;
      type: string;
      teamId: number;
      enabled: boolean;
      usersCanEditRelation: boolean;
      isWeightsEnabled: boolean;
      createdAt: Date;
      updatedAt: Date;
      options?: JsonValue;
    };
    value: string;
    slug: string;
  };
}

export interface AttributeToUserCreateInput {
  memberId: number;
  attributeOptionId: string;
}

export interface AttributeToUserWhereInput {
  memberId?: number;
  attributeOptionId?: string;
  OR?: AttributeToUserWhereInput[];
  AND?: AttributeToUserWhereInput[];
}

export interface IAttributeToUserRepository {
  createManySkipDuplicates(data: AttributeToUserCreateInput[]): Promise<{ count: number }>;

  deleteMany(where: AttributeToUserWhereInput): Promise<{ count: number }>;

  findManyIncludeAttribute(where: AttributeToUserWhereInput): Promise<AttributeToUserWithAttributeDto[]>;

  findManyByOrgMembershipIds(params: { orgMembershipIds: number[] }): Promise<AttributeToUserDto[]>;
}
