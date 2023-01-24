import { z } from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import {
  samlProductID,
  samlTenantID,
  tenantPrefix,
  canAccess,
  oidcPath,
} from "@calcom/features/ee/sso/lib/saml";

import { TRPCError } from "@trpc/server";

import { router, authedProcedure } from "../../trpc";

export const ssoRouter = router({
  // Retrieve SSO Connection
  get: authedProcedure
    .input(
      z.object({
        teamId: z.union([z.number(), z.null()]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = input;

      const { message, access } = await canAccess(ctx.user, teamId);

      if (!access) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      const { connectionController, samlSPConfig } = await jackson();

      // Retrieve the SP SAML Config
      const SPConfig = await samlSPConfig.get();

      try {
        const connections = await connectionController.getConnections({
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });

        if (connections.length === 0) {
          return null;
        }

        const type = "idpMetadata" in connections[0] ? "saml" : "oidc";

        return {
          ...connections[0],
          type,
          acsUrl: type === "saml" ? SPConfig.acsUrl : null,
          entityId: type === "saml" ? SPConfig.entityId : null,
          callbackUrl: type === "oidc" ? `${process.env.NEXT_PUBLIC_WEBAPP_URL}${oidcPath}` : null,
        };
      } catch (err) {
        console.error("Error getting SSO connection", err);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Fetching SSO connection failed." });
      }
    }),
  // Update the SAML Connection
  update: authedProcedure
    .input(
      z.object({
        encodedRawMetadata: z.string(),
        teamId: z.union([z.number(), z.null()]),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
    }),
  // Delete the SAML Connection
  delete: authedProcedure
    .input(
      z.object({
        teamId: z.union([z.number(), z.null()]),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
    }),

  // Update the OIDC Connection
  updateOIDC: authedProcedure
    .input(
      z.object({
        teamId: z.union([z.number(), z.null()]),
        clientId: z.string(),
        clientSecret: z.string(),
        wellKnownUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, clientId, clientSecret, wellKnownUrl } = input;

      const { message, access } = await canAccess(ctx.user, teamId);

      if (!access) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      const { connectionController } = await jackson();

      try {
        return await connectionController.createOIDCConnection({
          defaultRedirectUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/auth/saml/idp`,
          redirectUrl: JSON.stringify([`${process.env.NEXT_PUBLIC_WEBAPP_URL}/*`]),
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
          oidcClientId: clientId,
          oidcClientSecret: clientSecret,
          oidcDiscoveryUrl: wellKnownUrl,
        });
      } catch (err) {
        console.error("Error updating OIDC connection", err);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Updating OIDC Connection failed." });
      }
    }),
});
