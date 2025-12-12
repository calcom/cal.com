/**
 * ORM-agnostic interface for AttributeRepository
 * This interface defines the contract for attribute data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { AttributeType } from "@calcom/prisma/enums";

export interface AttributeOptionDto {
  id: string;
  value: string;
  slug: string;
}

export interface AttributeWithOptionsDto {
  id: string;
  name: string;
  type: AttributeType;
  slug: string;
  options: AttributeOptionDto[];
}

export interface AttributeOptionWithWeightsDto {
  id: string;
  value: string;
  slug: string;
  assignedUsers: {
    member: { userId: number };
    weight: number;
  }[];
}

export interface AttributeWithWeightsDto {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  options: AttributeOptionWithWeightsDto[];
}

export interface IAttributeRepository {
  findManyByNamesAndOrgIdIncludeOptions(params: {
    attributeNames: string[];
    orgId: number;
  }): Promise<AttributeWithOptionsDto[]>;

  findManyByOrgId(params: { orgId: number }): Promise<AttributeWithOptionsDto[]>;

  findAllByOrgIdWithOptions(params: { orgId: number }): Promise<AttributeWithOptionsDto[]>;

  findUniqueWithWeights(params: {
    teamId: number;
    attributeId: string;
    isWeightsEnabled?: boolean;
  }): Promise<AttributeWithWeightsDto | null>;
}
