import { readonlyPrisma as prisma } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { getSerializableForm } from "@calcom/routing-forms/lib/getSerializableForm";

class RouterPositionInsights {
  static async getUserRelevantTeamRoutingForms({ userId }: { userId: number }) {
    type FormWithRelations = App_RoutingForms_Form & {
      team: {
        parentId: number | null;
        parent: { slug: string } | null;
        metadata: any;
      };
      user: {
        id: number;
        username: string | null;
        movedToProfileId: number | null;
      };
    };

    const formsRedirectingToWeightedRR = await prisma.$queryRaw<FormWithRelations[]>`
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
        AND EXISTS (
          SELECT 1
          FROM "Host" h
          WHERE h."eventTypeId" = e.id
          AND h."userId" = ${userId}
        );
    `;

    // Convert the raw forms to serializable format
    const serializableForms = await Promise.all(
      formsRedirectingToWeightedRR.map(async (form) => {
        const serializedForm = await getSerializableForm({ form });
        return {
          ...serializedForm,
          team: form.team,
        };
      })
    );

    return serializableForms;
  }
}

export { RouterPositionInsights };
