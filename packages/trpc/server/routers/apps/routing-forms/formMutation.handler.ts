import { createFallbackRoute } from "@calcom/app-store/routing-forms/lib/createFallbackRoute";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { isFallbackRoute } from "@calcom/app-store/routing-forms/lib/isFallbackRoute";
import isRouter from "@calcom/app-store/routing-forms/lib/isRouter";
import isRouterLinkedField from "@calcom/app-store/routing-forms/lib/isRouterLinkedField";
import type { SerializableForm } from "@calcom/app-store/routing-forms/types/types";
import { zodFields, zodRouterRoute, zodRoutes } from "@calcom/app-store/routing-forms/zod";
import {
  entityPrismaWhereClause,
  canEditEntity,
} from "@calcom/features/pbac/lib/entityPermissionUtils.server";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { PrismaClient } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TFormMutationInputSchema } from "./formMutation.schema";
import { checkPermissionOnExistingRoutingForm } from "./permissions";

interface FormMutationHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFormMutationInputSchema;
}

export const formMutationHandler = async ({ ctx, input }: FormMutationHandlerOptions) => {
  const { user, prisma } = ctx;
  const { name, id, description, disabled, addFallback, duplicateFrom, shouldConnect } = input;
  let teamId = input.teamId;
  const settings = input.settings;

  const existingForm = await prisma.app_RoutingForms_Form.findUnique({
    where: { id },
    select: { id: true },
  });
  if (existingForm) {
    // Check PBAC permissions for updating routing forms only
    await checkPermissionOnExistingRoutingForm({
      formId: existingForm.id,
      userId: user.id,
      permission: "routingForm.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });
  } else if (teamId) {
    // Check PBAC permissions for creating team-scoped routing forms only
    // Personal forms (teamId = null) are always allowed for the user
    const permissionService = new PermissionCheckService();
    const hasPermission = await permissionService.checkPermission({
      userId: user.id,
      teamId,
      permission: "routingForm.create",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have permission to create routing forms for this team`,
      });
    }
  }

  let { routes: inputRoutes, fields: inputFields } = input;

  inputFields = inputFields || [];
  inputRoutes = inputRoutes || [];
  type InputFields = NonNullable<typeof inputFields>;
  type InputRoutes = NonNullable<typeof inputRoutes>;
  let routes: InputRoutes;
  let fields: InputFields;
  type DuplicateFrom = NonNullable<typeof duplicateFrom>;

  const dbForm = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      user: true,
      name: true,
      description: true,
      userId: true,
      disabled: true,
      createdAt: true,
      updatedAt: true,
      routes: true,
      fields: true,
      settings: true,
      teamId: true,
      position: true,
      updatedById: true,
    },
  });

  const dbSerializedForm = dbForm
    ? await getSerializableForm({ form: dbForm, withDeletedFields: true })
    : null;

  if (duplicateFrom) {
    ({ teamId, routes, fields } = await getRoutesAndFieldsForDuplication({ duplicateFrom, userId: user.id }));
  } else {
    [fields, routes] = [inputFields, inputRoutes];
    if (dbSerializedForm) {
      fields = markMissingFieldsDeleted(dbSerializedForm, fields);
    }
  }

  if (dbSerializedForm) {
    // If it's an existing form being mutated, update fields in the connected forms(if any).
    await updateFieldsInConnectedForms(dbSerializedForm, inputFields);
  }

  fields = await getUpdatedRouterLinkedFields(fields, routes);

  if (addFallback) {
    // Add a fallback route if there is none
    if (!routes.find(isFallbackRoute)) {
      routes.push(createFallbackRoute());
    }
  }

  // Validate the users passed
  if (teamId && settings?.sendUpdatesTo?.length) {
    const sendUpdatesTo = await prisma.membership.findMany({
      where: {
        teamId,
        userId: {
          in: settings.sendUpdatesTo,
        },
      },
      select: {
        userId: true,
      },
    });
    settings.sendUpdatesTo = sendUpdatesTo.map((member) => member.userId);
    // If its not a team, the user is sending the value, we will just ignore it
  } else if (!teamId && settings?.sendUpdatesTo) {
    delete settings.sendUpdatesTo;
  }

  return await prisma.app_RoutingForms_Form.upsert({
    where: {
      id: id,
    },
    create: {
      user: {
        connect: {
          id: user.id,
        },
      },
      fields,
      name: name,
      description,
      // Prisma doesn't allow setting null value directly for JSON. It recommends using JsonNull for that case.
      routes: routes === null ? Prisma.JsonNull : routes,
      id: id,
      ...(teamId
        ? {
            team: {
              connect: {
                id: teamId ?? undefined,
              },
            },
          }
        : null),
    },
    update: {
      disabled: disabled,
      fields,
      name: name,
      description,
      settings: settings === null ? Prisma.JsonNull : settings,
      routes: routes === null ? Prisma.JsonNull : routes,
      updatedById: user.id,
    },
  });

  /**
   * If Form has Router Linked fields, enrich them with the latest info from the Router
   * If Form doesn't have Router fields but there is a Router used in routes, add all the fields from the Router
   */
  async function getUpdatedRouterLinkedFields(fields: InputFields, routes: InputRoutes) {
    const routerLinkedFields: Record<string, boolean> = {};
    for (const [, field] of Object.entries(fields)) {
      if (!isRouterLinkedField(field)) {
        continue;
      }
      routerLinkedFields[field.routerId] = true;

      if (!routes.some((route) => route.id === field.routerId)) {
        // If the field is from a router that is not available anymore, mark it as deleted
        field.deleted = true;
        continue;
      }
      // Get back deleted field as now the Router is there for it.
      if (field.deleted) field.deleted = false;
      const router = await prisma.app_RoutingForms_Form.findFirst({
        where: {
          id: field.routerId,
          userId: user.id,
        },
      });
      if (router) {
        assertIfInvalidRouter(router);
        const parsedRouterFields = zodFields.parse(router.fields);

        // There is a field from some router available, make sure that the field has up-to-date info from the router
        const routerField = parsedRouterFields?.find((f) => f.id === field.id);
        // Update local field(cache) with router field on every mutation
        Object.assign(field, routerField);
      }
    }

    for (const [, route] of Object.entries(routes)) {
      if (!isRouter(route)) {
        continue;
      }

      // If there is a field that belongs to router, then all fields must be there already. So, need to add Router fields
      if (routerLinkedFields[route.id]) {
        continue;
      }

      const router = await prisma.app_RoutingForms_Form.findFirst({
        where: {
          id: route.id,
          userId: user.id,
        },
      });
      if (router) {
        assertIfInvalidRouter(router);
        const parsedRouterFields = zodFields.parse(router.fields);
        const fieldsFromRouter = parsedRouterFields
          ?.filter((f) => !f.deleted)
          .map((f) => {
            return {
              ...f,
              routerId: route.id,
            };
          });

        if (fieldsFromRouter) {
          fields = fields.concat(fieldsFromRouter);
        }
      }
    }
    return fields;
  }

  function findFieldWithId(id: string, fields: InputFields) {
    return fields.find((field) => field.id === id);
  }

  /**
   * Update fields in connected forms as per the inputFields
   */
  async function updateFieldsInConnectedForms(
    serializedForm: SerializableForm<App_RoutingForms_Form>,
    inputFields: InputFields
  ) {
    for (const [, connectedForm] of Object.entries(serializedForm.connectedForms)) {
      const connectedFormDb = await prisma.app_RoutingForms_Form.findUnique({
        where: {
          id: connectedForm.id,
        },
      });
      if (!connectedFormDb) {
        continue;
      }
      const connectedFormFields = zodFields.parse(connectedFormDb.fields);

      const fieldsThatAreNotInConnectedForm = (
        inputFields?.filter((f) => !findFieldWithId(f.id, connectedFormFields || [])) || []
      ).map((f) => ({
        ...f,
        routerId: serializedForm.id,
      }));

      const updatedConnectedFormFields = connectedFormFields
        // Update fields that are already in connected form
        ?.map((field) => {
          if (isRouterLinkedField(field) && field.routerId === serializedForm.id) {
            return {
              ...field,
              ...findFieldWithId(field.id, inputFields || []),
            };
          }
          return field;
        })
        // Add fields that are not there
        .concat(fieldsThatAreNotInConnectedForm);

      await prisma.app_RoutingForms_Form.update({
        where: {
          id: connectedForm.id,
        },
        data: {
          fields: updatedConnectedFormFields,
          updatedById: user.id,
        },
      });
    }
  }

  async function getRoutesAndFieldsForDuplication({
    duplicateFrom,
    userId,
  }: {
    duplicateFrom: DuplicateFrom;
    userId: number;
  }) {
    const sourceForm = await prisma.app_RoutingForms_Form.findFirst({
      where: {
        ...entityPrismaWhereClause({ userId }),
        id: duplicateFrom,
      },
      select: {
        id: true,
        fields: true,
        routes: true,
        userId: true,
        teamId: true,
        team: {
          select: {
            id: true,
            members: true,
          },
        },
      },
    });

    if (!sourceForm) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Form to duplicate: ${duplicateFrom} not found`,
      });
    }

    if (!(await canEditEntity(sourceForm, userId))) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Form to duplicate: ${duplicateFrom} not found or you are unauthorized`,
      });
    }

    //TODO: Instead of parsing separately, use getSerializableForm. That would automatically remove deleted fields as well.
    const fieldsParsed = zodFields.safeParse(sourceForm.fields);
    const routesParsed = zodRoutes.safeParse(sourceForm.routes);
    if (!fieldsParsed.success || !routesParsed.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not parse source form's fields or routes",
      });
    }

    let fields, routes;
    if (shouldConnect) {
      routes = [
        // This connected route would automatically link the fields
        zodRouterRoute.parse({
          id: sourceForm.id,
          isRouter: true,
        }),
      ];
      fields =
        fieldsParsed.data
          // Deleted fields in the form shouldn't be added to the new form
          ?.filter((f) => !f.deleted)
          .map((f) => {
            return {
              id: f.id,
              routerId: sourceForm.id,
              label: "",
              type: "",
            };
          }) || [];
    } else {
      // Duplicate just routes and fields
      // We don't want name, description and responses to be copied
      routes = routesParsed.data || [];
      // FIXME: Deleted fields shouldn't come in duplicate
      fields = fieldsParsed.data ? fieldsParsed.data.filter((f) => !f.deleted) : [];
    }
    return { teamId: sourceForm.teamId, routes, fields };
  }

  function markMissingFieldsDeleted(
    serializedForm: SerializableForm<App_RoutingForms_Form>,
    fields: InputFields
  ) {
    // Find all fields that are in DB(including deleted) but not in the mutation
    // e.g. inputFields is [A,B,C]. DB is [A,B,C,D,E,F]. It means D,E,F got deleted
    const deletedFields =
      serializedForm.fields?.filter((f) => !fields.find((field) => field.id === f.id)) || [];

    // Add back deleted fields in the end and mark them deleted.
    // Fields mustn't be deleted, to make sure columns never decrease which hugely simplifies CSV generation
    fields = fields.concat(
      deletedFields.map((f) => {
        f.deleted = true;
        return f;
      })
    );
    return fields;
  }
  function assertIfInvalidRouter(router: App_RoutingForms_Form) {
    const routesOfRouter = zodRoutes.parse(router.routes);
    if (routesOfRouter) {
      if (routesOfRouter.find(isRouter)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "A form being used as a Router must be a Origin form. It must not be using any other Router.",
        });
      }
    }
  }
};

export default formMutationHandler;
