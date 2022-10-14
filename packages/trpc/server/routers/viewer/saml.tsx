import { z } from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { samlProductID, samlTenantID, tenantPrefix, canAccess } from "@calcom/features/ee/sso/lib/saml";
import { isTeamOwner } from "@calcom/lib/server/queries/teams";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

// TODO: Update the message after talking to the Cal.com team
const message =
  "You don't have enough permission. Please get in touch with the administrator or make sure you have enabled the SAML SSO.";

export const samlRouter = createProtectedRouter()
  // Retrieve SAML SSO access
  .query("access", {
    input: z.object({
      teamsView: z.boolean(),
    }),
    async resolve({ ctx, input }) {
      const { teamsView } = input;
      const { email, plan } = ctx.user;

      const enabled = canAccess(email, plan, teamsView);

      if (!enabled) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message,
        });
      }

      return { enabled };
    },
  })

  // Retrieve SAML Connection
  .query("get", {
    input: z.object({
      teamsView: z.boolean(),
      teamId: z.union([z.number(), z.null()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController, samlSPConfig } = await jackson();

      const { email, plan } = ctx.user;
      const { teamsView, teamId } = input;

      if (!canAccess(email, plan, teamsView)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message,
        });
      }

      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Retrieve the SP SAML Config
      const SPConfig = samlSPConfig.get();

      const response = {
        provider: null,
        acsUrl: SPConfig.acsUrl,
        entityId: SPConfig.entityId,
      };

      try {
        const result = await connectionController.getConnections({
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });

        if (result && result.length > 0) {
          response["provider"] = result[0].idpMetadata.provider;
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
      teamId: z.union([z.number(), z.null(), z.undefined()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController } = await jackson();

      const { email, plan } = ctx.user;
      const { encodedRawMetadata, teamId } = input;

      const teamsView = teamId ? true : false;

      if (!canAccess(email, plan, teamsView)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message,
        });
      }

      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
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
      teamId: z.union([z.number(), z.null(), z.undefined()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController } = await jackson();

      const { email, plan } = ctx.user;
      const { teamId } = input;

      const teamsView = teamId ? true : false;

      if (!canAccess(email, plan, teamsView)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message,
        });
      }

      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
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
