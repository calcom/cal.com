import type { Kysely } from "kysely";

import type { JsonValue } from "@calcom/prisma/client";
import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  FormResponseDto,
  FormResponseWithBookingDto,
  FormResponseWithFormDto,
  IRoutingFormResponseRepository,
  QueuedFormResponseDto,
  RecordFormResponseInputDto,
} from "./IRoutingFormResponseRepository";

export class KyselyRoutingFormResponseRepository implements IRoutingFormResponseRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async recordFormResponse(
    input: RecordFormResponseInputDto & { queuedFormResponseId?: string | null }
  ): Promise<FormResponseDto> {
    const result = await this.writeDb
      .insertInto("App_RoutingForms_FormResponse")
      .values({
        formId: input.formId,
        response: JSON.stringify(input.response),
        chosenRouteId: input.chosenRouteId,
        ...(input.queuedFormResponseId ? { queuedFormResponseId: input.queuedFormResponseId } : {}),
      })
      .returning(["id", "formId", "response", "chosenRouteId", "createdAt"])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      formId: result.formId,
      response: result.response as JsonValue,
      chosenRouteId: result.chosenRouteId,
      createdAt: result.createdAt,
    };
  }

  async recordQueuedFormResponse(input: RecordFormResponseInputDto): Promise<{ id: string }> {
    const result = await this.writeDb
      .insertInto("App_RoutingForms_QueuedFormResponse")
      .values({
        formId: input.formId,
        response: JSON.stringify(input.response),
        chosenRouteId: input.chosenRouteId,
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    return { id: result.id };
  }

  async findFormResponseIncludeForm(params: {
    routingFormResponseId: number;
  }): Promise<FormResponseWithFormDto | null> {
    const result = await this.readDb
      .selectFrom("App_RoutingForms_FormResponse as fr")
      .innerJoin("App_RoutingForms_Form as f", "f.id", "fr.formId")
      .select([
        "fr.response",
        "fr.chosenRouteId",
        "f.routes as formRoutes",
        "f.fields as formFields",
      ])
      .where("fr.id", "=", params.routingFormResponseId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      response: result.response as JsonValue,
      form: {
        routes: result.formRoutes as JsonValue,
        fields: result.formFields as JsonValue,
      },
      chosenRouteId: result.chosenRouteId,
    };
  }

  async findQueuedFormResponseIncludeForm(params: {
    queuedFormResponseId: string;
  }): Promise<FormResponseWithFormDto | null> {
    const result = await this.readDb
      .selectFrom("App_RoutingForms_QueuedFormResponse as qfr")
      .innerJoin("App_RoutingForms_Form as f", "f.id", "qfr.formId")
      .select([
        "qfr.response",
        "qfr.chosenRouteId",
        "f.routes as formRoutes",
        "f.fields as formFields",
      ])
      .where("qfr.id", "=", params.queuedFormResponseId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      response: result.response as JsonValue,
      form: {
        routes: result.formRoutes as JsonValue,
        fields: result.formFields as JsonValue,
      },
      chosenRouteId: result.chosenRouteId,
    };
  }

  async getQueuedFormResponseFromId(id: string): Promise<QueuedFormResponseDto | null> {
    const result = await this.readDb
      .selectFrom("App_RoutingForms_QueuedFormResponse as qfr")
      .innerJoin("App_RoutingForms_Form as f", "f.id", "qfr.formId")
      .leftJoin("Team as t", "t.id", "f.teamId")
      .leftJoin("users as u", "u.id", "f.userId")
      .select([
        "qfr.id",
        "qfr.formId",
        "qfr.response",
        "qfr.chosenRouteId",
        "qfr.createdAt",
        "qfr.updatedAt",
        "qfr.actualResponseId",
        "t.parentId as teamParentId",
        "u.id as userId",
        "u.email as userEmail",
        "u.timeFormat as userTimeFormat",
        "u.locale as userLocale",
        "f.id as formIdField",
        "f.description as formDescription",
        "f.position as formPosition",
        "f.routes as formRoutes",
        "f.createdAt as formCreatedAt",
        "f.updatedAt as formUpdatedAt",
        "f.name as formName",
        "f.fields as formFields",
        "f.updatedById as formUpdatedById",
        "f.userId as formUserId",
        "f.teamId as formTeamId",
        "f.disabled as formDisabled",
        "f.settings as formSettings",
      ])
      .where("qfr.id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      formId: result.formId,
      response: result.response as JsonValue,
      chosenRouteId: result.chosenRouteId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      actualResponseId: result.actualResponseId,
      form: {
        team: result.teamParentId !== undefined ? { parentId: result.teamParentId } : null,
        user: result.userId
          ? {
              id: result.userId,
              email: result.userEmail!,
              timeFormat: result.userTimeFormat,
              locale: result.userLocale,
            }
          : null,
        id: result.formIdField,
        description: result.formDescription,
        position: result.formPosition,
        routes: result.formRoutes as JsonValue,
        createdAt: result.formCreatedAt,
        updatedAt: result.formUpdatedAt,
        name: result.formName,
        fields: result.formFields as JsonValue,
        updatedById: result.formUpdatedById,
        userId: result.formUserId,
        teamId: result.formTeamId,
        disabled: result.formDisabled,
        settings: result.formSettings as JsonValue,
      },
    };
  }

  async findAllResponsesWithBooking(params: {
    formId: string;
    responseId: number;
    createdAfter: Date;
    createdBefore: Date;
  }): Promise<FormResponseWithBookingDto[]> {
    const results = await this.readDb
      .selectFrom("App_RoutingForms_FormResponse")
      .select(["id", "response"])
      .where("formId", "=", params.formId)
      .where("createdAt", ">=", params.createdAfter)
      .where("createdAt", "<", params.createdBefore)
      .where("routedToBookingUid", "is not", null)
      .where("id", "!=", params.responseId)
      .execute();

    return results.map((r) => ({
      id: r.id,
      response: r.response as JsonValue,
    }));
  }
}
