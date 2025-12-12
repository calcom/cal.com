/**
 * ORM-agnostic interface for AttributeOptionRepository
 * This interface defines the contract for attribute option data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface AttributeOptionDto {
  id: string;
  value: string;
  slug: string;
  attributeId: string;
}

export interface AttributeOptionCreateInput {
  id?: string;
  value: string;
  slug: string;
  attributeId: string;
  isGroup?: boolean;
  contains?: string[];
}

export interface IAttributeOptionRepository {
  findMany(params: { orgId: number }): Promise<AttributeOptionDto[]>;

  createMany(params: { createManyInput: AttributeOptionCreateInput[] }): Promise<{ count: number }>;
}
