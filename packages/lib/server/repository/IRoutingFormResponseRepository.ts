/**
 * ORM-agnostic interface for RoutingFormResponseRepository
 * This interface defines the contract for routing form response data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { JsonValue } from "@calcom/prisma/client";

export interface RecordFormResponseInputDto {
  formId: string;
  response: Record<string, unknown> | JsonValue;
  chosenRouteId: string | null;
}

export interface FormResponseDto {
  id: number;
  formId: string;
  response: JsonValue;
  chosenRouteId: string | null;
  createdAt: Date;
}

export interface FormResponseWithFormDto {
  response: JsonValue;
  form: {
    routes: JsonValue;
    fields: JsonValue;
  };
  chosenRouteId: string | null;
}

export interface QueuedFormResponseDto {
  id: string;
  formId: string;
  response: JsonValue;
  chosenRouteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  actualResponseId: number | null;
  form: {
    team: { parentId: number | null } | null;
    user: {
      id: number;
      email: string;
      timeFormat: number | null;
      locale: string | null;
    } | null;
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
  };
}

export interface FormResponseWithBookingDto {
  id: number;
  response: JsonValue;
}

export interface IRoutingFormResponseRepository {
  recordFormResponse(
    input: RecordFormResponseInputDto & { queuedFormResponseId?: string | null }
  ): Promise<FormResponseDto>;
  recordQueuedFormResponse(input: RecordFormResponseInputDto): Promise<{ id: string }>;
  findFormResponseIncludeForm(params: {
    routingFormResponseId: number;
  }): Promise<FormResponseWithFormDto | null>;
  findQueuedFormResponseIncludeForm(params: {
    queuedFormResponseId: string;
  }): Promise<FormResponseWithFormDto | null>;
  getQueuedFormResponseFromId(id: string): Promise<QueuedFormResponseDto | null>;
  findAllResponsesWithBooking(params: {
    formId: string;
    responseId: number;
    createdAfter: Date;
    createdBefore: Date;
  }): Promise<FormResponseWithBookingDto[]>;
}
