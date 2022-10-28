import { z } from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { samlProductID, samlTenantID, tenantPrefix, canAccess } from "@calcom/features/ee/sso/lib/saml";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const samlRouter = createProtectedRouter()
  // Retrieve SAML Connection
  .query("get", {
    input: z.object({
      teamId: z.union([z.number(), z.null()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController, samlSPConfig } = await jackson();

      const { teamId } = input;

      const { message, access } = await canAccess(ctx.user, teamId);

      if (!access) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      // Retrieve the SP SAML Config
      const SPConfig = samlSPConfig.get();

      const response = {
        provider: "",
        acsUrl: SPConfig.acsUrl,
        entityId: SPConfig.entityId,
      };

      try {
        const connections = await connectionController.getConnections({
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });

        if (connections.length > 0 && "idpMetadata" in connections[0]) {
          response["provider"] = connections[0].idpMetadata.provider;
        }
      } catch (err) {
        console.error("Error getting SAML config", err);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Fetching SAML Connection failed." });
      }

      return response;
    },
  })

  // Update the SAML Connection
  .mutation("update", {
    input: z.object({
      encodedRawMetadata: z.string(),
      teamId: z.union([z.number(), z.null()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController } = await jackson();

      const { encodedRawMetadata, teamId } = input;

      const { message, access } = await canAccess(ctx.user, teamId);

      if (!access) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      try {
        return await connectionController.createSAMLConnection({
          encodedRawMetadata,
          defaultRedirectUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/auth/saml/idp`,
          redirectUrl: JSON.stringify([`${process.env.NEXT_PUBLIC_WEBAPP_URL}/*`]),
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });
      } catch (err) {
        console.error("Error updating SAML connection", err);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Updating SAML Connection failed." });
      }
    },
  })

  // Delete the SAML Connection
  .mutation("delete", {
    input: z.object({
      teamId: z.union([z.number(), z.null()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController } = await jackson();

      const { teamId } = input;

      const { message, access } = await canAccess(ctx.user, teamId);

      if (!access) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      try {
        return await connectionController.deleteConnections({
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });
      } catch (err) {
        console.error("Error deleting SAML connection", err);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Deleting SAML Connection failed." });
      }
    },
  });
