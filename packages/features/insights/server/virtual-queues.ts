import { readonlyPrisma as prisma } from "@calcom/prisma";
import { getSerializableForm } from "@calcom/routing-forms/lib/getSerializableForm";

class VirtualQueuesInsights {
  static async getUserRelevantTeamRoutingForms({ userId }: { userId: number }) {
    type JsonField = { [key: string]: any };

    type RoutingFormType = {
      id: string;
      description: string | null;
      position: number;
      routes: JsonField | null;
      createdAt: Date;
      updatedAt: Date;
      name: string;
      fields: JsonField | null;
      userId: number;
      teamId: number | null;
      disabled: boolean;
      settings: JsonField | null;
      updatedById: number | null;
    };

    const formsRedirectingToWeightedRR: RoutingFormType[] = await prisma.$queryRaw<RoutingFormType[]>`
      WITH RECURSIVE json_array_elements_recursive AS (
        SELECT f.id, f."teamId",
               jsonb_array_elements(f.routes::jsonb) as route
        FROM "App_RoutingForms_Form" f
        WHERE f."teamId" IN (
          SELECT "teamId"
          FROM "Membership"
          WHERE "userId" = ${userId}
        )
      )
      SELECT DISTINCT f.*,
        jsonb_build_object(
          'parentId', t."parentId",
          'parent', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('slug', p.slug) ELSE NULL END,
          'metadata', t.metadata
        ) as team,
        jsonb_build_object(
          'id', u.id,
          'username', u.username,
          'movedToProfileId', u."movedToProfileId"
        ) as "user"
      FROM "App_RoutingForms_Form" f
      INNER JOIN json_array_elements_recursive r ON f.id = r.id
      INNER JOIN "EventType" e ON (r.route->>'action')::jsonb->>'eventTypeId' = e.id::text
      INNER JOIN "Team" t ON f."teamId" = t.id
      LEFT JOIN "Team" p ON t."parentId" = p.id
      INNER JOIN "users" u ON f."userId" = u.id
      WHERE e."schedulingType" = 'roundRobin'
        AND e."isRRWeightsEnabled" = true
        AND (
          EXISTS (
          SELECT 1
          FROM "Host" h
          WHERE h."eventTypeId" = e.id
          AND h."userId" = ${userId}
          )
          OR EXISTS (
          SELECT 1
          FROM "Membership" m
          WHERE m."teamId" = f."teamId"
            AND m."userId" = ${userId}
            AND m.role = 'ADMIN'
          )
          OR EXISTS (
          SELECT 1
          FROM "Membership" m
          WHERE m."teamId" = t."parentId"
            AND m."userId" = ${userId}
            AND m.role = 'ADMIN'
          )
        )
        AND (t."rrTimestampBasis" IS NULL OR t."rrTimestampBasis" = 'CREATED_AT')
    `;

    // Convert the raw forms to serializable format
    const serializableForms = await Promise.all(
      formsRedirectingToWeightedRR.map(async (form) => {
        const serializedForm = await getSerializableForm({ form });
        return serializedForm;
      })
    );

    return serializableForms;
  }
}

export { VirtualQueuesInsights };
