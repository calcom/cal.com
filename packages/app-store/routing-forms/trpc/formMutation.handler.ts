import type { PrismaClient } from "@prisma/client";
import type { App_RoutingForms_Form } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { createFallbackRoute } from "../lib/createFallbackRoute";
import { getSerializableForm } from "../lib/getSerializableForm";
import { isFallbackRoute } from "../lib/isFallbackRoute";
import { isFormEditAllowed } from "../lib/isFormEditAllowed";
import isRouter from "../lib/isRouter";
import isRouterLinkedField from "../lib/isRouterLinkedField";
import type { SerializableForm } from "../types/types";
import { zodFields, zodRouterRoute, zodRoutes } from "../zod";
import type { TFormMutationInputSchema } from "./formMutation.schema";

interface FormMutationHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFormMutationInputSchema;
}
export const formMutationHandler = async ({ ctx, input }: FormMutationHandlerOptions) => {
  const { user, prisma } = ctx;
  const { name, id, description, settings, disabled, addFallback, duplicateFrom, shouldConnect } = input;
  if (!(await isFormEditAllowed({ userId: user.id, formId: id }))) {
    throw new TRPCError({
      code: "FORBIDDEN",
    });
  }
  let { routes: inputRoutes } = input;
  let { fields: inputFields } = input;
  inputFields = inputFields || [];
  inputRoutes = inputRoutes || [];
  type InputFields = typeof inputFields;
  type InputRoutes = typeof inputRoutes;
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
    },
  });

  const dbSerializedForm = dbForm ? await getSerializableForm(dbForm, true) : null;

  if (duplicateFrom) {
    ({ routes, fields } = await getRoutesAndFieldsForDuplication(duplicateFrom));
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
    },
    update: {
      disabled: disabled,
      fields,
      name: name,
      description,
      settings: settings === null ? Prisma.JsonNull : settings,
      routes: routes === null ? Prisma.JsonNull : routes,
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
      const connectedFormDb = await prisma.app_RoutingForms_Form.findFirst({
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
        },
      });
    }
  }

  async function getRoutesAndFieldsForDuplication(duplicateFrom: DuplicateFrom) {
    const sourceForm = await prisma.app_RoutingForms_Form.findFirst({
      where: {
        userId: user.id,
        id: duplicateFrom,
      },
      select: {
        id: true,
        fields: true,
        routes: true,
      },
    });
    if (!sourceForm) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Form to duplicate: ${duplicateFrom} not found`,
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
    return { routes, fields };
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
