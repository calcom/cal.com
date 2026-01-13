import { z } from "zod";

import { BookingPageAppearanceRepository } from "@calcom/features/booking-page-appearance/repositories/BookingPageAppearanceRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { bookingPageAppearanceSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

const bookingPageAppearanceRepository = new BookingPageAppearanceRepository(prisma);

export const bookingPageAppearanceRouter = router({
  /**
   * Get the current user's booking page appearance settings.
   * Only available for organization members.
   */
  get: authedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;

    if (!organizationId) {
      return {
        hasAccess: false,
        appearance: null,
        cascadePriority: null,
      };
    }

    const [userAppearance, orgAppearance, orgSettings] = await Promise.all([
      bookingPageAppearanceRepository.findByUserId(ctx.user.id),
      bookingPageAppearanceRepository.findByOrganizationId(organizationId),
      prisma.organizationSettings.findUnique({
        where: { organizationId },
        select: { appearanceCascadePriority: true },
      }),
    ]);

    const cascadePriority = orgSettings?.appearanceCascadePriority ?? "ORGANIZATION_FIRST";

    // Determine effective appearance based on cascade priority
    let effectiveAppearance = null;
    if (cascadePriority === "USER_FIRST") {
      effectiveAppearance = userAppearance?.bookingPageAppearance ?? orgAppearance?.bookingPageAppearance;
    } else {
      effectiveAppearance = orgAppearance?.bookingPageAppearance ?? userAppearance?.bookingPageAppearance;
    }

    return {
      hasAccess: true,
      appearance: effectiveAppearance,
      userAppearance: userAppearance?.bookingPageAppearance ?? null,
      orgAppearance: orgAppearance?.bookingPageAppearance ?? null,
      cascadePriority,
      brandColor: userAppearance?.brandColor ?? orgAppearance?.brandColor ?? null,
      darkBrandColor: userAppearance?.darkBrandColor ?? orgAppearance?.darkBrandColor ?? null,
    };
  }),

  /**
   * Get organization-level appearance settings.
   * Requires org admin permission.
   */
  getForOrganization: authedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;

    if (!organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not a member of any organization.",
      });
    }

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "organization.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view organization appearance settings.",
      });
    }

    const [orgAppearance, orgSettings] = await Promise.all([
      bookingPageAppearanceRepository.findByOrganizationId(organizationId),
      prisma.organizationSettings.findUnique({
        where: { organizationId },
        select: { appearanceCascadePriority: true },
      }),
    ]);

    return {
      appearance: orgAppearance?.bookingPageAppearance ?? null,
      brandColor: orgAppearance?.brandColor ?? null,
      darkBrandColor: orgAppearance?.darkBrandColor ?? null,
      cascadePriority: orgSettings?.appearanceCascadePriority ?? "ORGANIZATION_FIRST",
    };
  }),

  /**
   * Update user's booking page appearance.
   * Only available for organization members.
   */
  update: authedProcedure
    .input(
      z.object({
        appearance: bookingPageAppearanceSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Booking page appearance customization is only available for organization members.",
        });
      }

      await bookingPageAppearanceRepository.updateByUserId(ctx.user.id, input.appearance);

      return { success: true };
    }),

  /**
   * Update organization's booking page appearance.
   * Requires org admin permission.
   */
  updateForOrganization: authedProcedure
    .input(
      z.object({
        appearance: bookingPageAppearanceSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of any organization.",
        });
      }

      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: organizationId,
        permission: "organization.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update organization appearance settings.",
        });
      }

      await bookingPageAppearanceRepository.updateByOrganizationId(organizationId, input.appearance);

      return { success: true };
    }),

  /**
   * Update organization's cascade priority setting.
   * Requires org admin permission.
   */
  updateCascadePriority: authedProcedure
    .input(
      z.object({
        priority: z.enum(["ORGANIZATION_FIRST", "USER_FIRST"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of any organization.",
        });
      }

      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: organizationId,
        permission: "organization.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update organization settings.",
        });
      }

      await prisma.organizationSettings.update({
        where: { organizationId },
        data: { appearanceCascadePriority: input.priority },
      });

      return { success: true };
    }),

  /**
   * Reset user's booking page appearance to default (inherit from org).
   */
  reset: authedProcedure.mutation(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;

    if (!organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Booking page appearance customization is only available for organization members.",
      });
    }

    await bookingPageAppearanceRepository.resetByUserId(ctx.user.id);

    return { success: true };
  }),

  /**
   * Reset organization's booking page appearance to default.
   * Requires org admin permission.
   */
  resetForOrganization: authedProcedure.mutation(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;

    if (!organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not a member of any organization.",
      });
    }

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "organization.update",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to update organization appearance settings.",
      });
    }

    await bookingPageAppearanceRepository.resetByOrganizationId(organizationId);

    return { success: true };
  }),
});
