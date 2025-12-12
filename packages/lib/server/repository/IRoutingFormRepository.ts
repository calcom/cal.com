/**
 * ORM-agnostic interface for RoutingFormRepository
 * This interface defines the contract for routing form data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { JsonValue } from "@calcom/prisma/client";

export interface RoutingFormBasicDto {
  id: string;
  name: string;
}

export interface RoutingFormDto {
  id: string;
  description: string | null;
  position: number;
  routes: JsonValue;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  fields: JsonValue;
  updatedById: number | null;
  userId: number;
  teamId: number | null;
  disabled: boolean;
  settings: JsonValue;
}

export interface RoutingFormWithUserTeamAndOrgDto {
  id: string;
  description: string | null;
  position: number;
  routes: JsonValue;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  fields: JsonValue;
  updatedById: number | null;
  userId: number;
  teamId: number | null;
  disabled: boolean;
  settings: JsonValue;
  user: {
    id: number;
    username: string | null;
    email: string;
    movedToProfileId: number | null;
    metadata: JsonValue;
    timeFormat: number | null;
    locale: string | null;
    organization: {
      slug: string | null;
    } | null;
  } | null;
  team: {
    parentId: number | null;
    parent: {
      slug: string | null;
    } | null;
    slug: string | null;
    metadata: JsonValue;
  } | null;
}

export interface IRoutingFormRepository {
  findById(id: string): Promise<RoutingFormDto | null>;

  findActiveFormsForUserOrTeam(params: {
    userId?: number;
    teamId?: number;
  }): Promise<RoutingFormBasicDto[]>;

  findFormByIdIncludeUserTeamAndOrg(formId: string): Promise<RoutingFormWithUserTeamAndOrgDto | null>;
}
