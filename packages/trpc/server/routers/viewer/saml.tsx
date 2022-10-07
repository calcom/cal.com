import { z } from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import {
  isSAMLAdmin,
  isSAMLLoginEnabled,
  samlProductID,
  samlTenantID,
  tenantPrefix,
} from "@calcom/features/ee/sso/lib/saml";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { isTeamOwner } from "@calcom/lib/server/queries/teams";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const samlRouter = createProtectedRouter()
  // Retrieve SAML Connection
  .query("get", {
    input: z.object({
      teamsView: z.boolean(),
      teamId: z.union([z.number(), z.null()]),
    }),
    async resolve({ ctx, input }) {
      const { connectionController } = await jackson();

      const { user } = ctx;
      const { teamsView, teamId } = input;

      const response = {
        samlEnabled: true,
        provider: null,
      };

      // SAML SSO disabled for the following conditions
      if ((teamsView && !HOSTED_CAL_FEATURES) || (!teamsView && HOSTED_CAL_FEATURES)) {
        response["samlEnabled"] = false;

        return response;
      }

      if (teamsView) {
        response["samlEnabled"] = isSAMLLoginEnabled && user.plan === "PRO";
      } else {
        response["samlEnabled"] = isSAMLLoginEnabled && isSAMLAdmin(user.email);
      }

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

      const { encodedRawMetadata, teamId } = input;

      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

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

      const { teamId } = input;

      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

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
