import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { z } from 'zod';
import { UserService } from '@/services/public';
import { AuthGuards, AuthRequest } from '@/auth/guards';
import { validateQuery, validateParams } from '@/middlewares/validation';
import { ResponseFormatter } from '@/utils/response';
import { commonSchemas } from '@/utils/validation';
import prisma from "@calcom/prisma";
import { uploadAvatar, uploadHeader } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { checkUsername } from "@calcom/lib/server/checkUsername";
import slugify from "@calcom/lib/slugify";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { Prisma } from "@prisma/client";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import { sendChangeOfEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";

const getUsersQuerySchema = z.object({
  ...commonSchemas.pagination.shape,
  email: z.string().optional(),
  search: z.string().optional(),
});

const getUserParamsSchema = z.object({
  id: commonSchemas.id,
});

// Profile update validation schema
const updateProfileBodySchema = z.object({
  username: z.string().optional(),
  name: z.string().max(FULL_NAME_LENGTH_MAX_LIMIT).optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  timeZone: timeZoneSchema.optional(),
  weekStart: z.string().optional(),
  hideBranding: z.boolean().optional(),
  allowDynamicBooking: z.boolean().optional(),
  allowSEOIndexing: z.boolean().optional(),
  receiveMonthlyDigestEmail: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  appTheme: z.string().optional().nullable(),
  completedOnboarding: z.boolean().optional(),
  locale: z.string().optional(),
  timeFormat: z.number().optional(),
  disableImpersonation: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  travelSchedules: z
    .array(
      z.object({
        id: z.number().optional(),
        timeZone: timeZoneSchema,
        endDate: z.string().optional(),
        startDate: z.string(),
      })
    )
    .optional(),
  secondaryEmails: z
    .array(
      z.object({
        id: z.number(),
        email: z.string(),
        isDeleted: z.boolean().default(false),
      })
    )
    .optional(),
});

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const userService = new UserService(prisma);
  // Route with specific auth methods allowed
  fastify.get('/me', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Get current user profile',
      tags: ['Users'],
      security: [
        { bearerAuth: [] },
      ],
      response: {
        200: {
          description: 'Current user profile',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                organizationId: { type: 'number', nullable: true },
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {

    const user = await userService.getUserById(Number(request.user!.id));

    // Add auth context to response
    const userWithAuthContext = {
      ...user,
      authMethod: request.authResult?.authMethod,
      organizationId: request.organizationId,
    };
    
    ResponseFormatter.success(reply, userWithAuthContext, 'Current user profile retrieved');
  });

  fastify.put('/edit-profile', { 
    preHandler: [
      AuthGuards.authenticateFlexible(),
      async (request, reply) => {
        try {
          const validatedData = updateProfileBodySchema.parse(request.body);
          request.body = validatedData;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return ResponseFormatter.error(reply, `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400);
          }
          return ResponseFormatter.error(reply, 'Invalid request body', 400);
        }
      }
    ],
    schema: {
      description: 'Edit user profile',
      tags: ['API Auth - Users'],
      body: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          bio: { type: 'string' },
          avatarUrl: { type: ['string', 'null'] },
          timeZone: { type: 'string' },
          weekStart: { type: 'string' },
          hideBranding: { type: 'boolean' },
          allowDynamicBooking: { type: 'boolean' },
          allowSEOIndexing: { type: 'boolean' },
          receiveMonthlyDigestEmail: { type: 'boolean' },
          brandColor: { type: 'string' },
          darkBrandColor: { type: 'string' },
          theme: { type: ['string', 'null'] },
          appTheme: { type: ['string', 'null'] },
          completedOnboarding: { type: 'boolean' },
          locale: { type: 'string' },
          timeFormat: { type: 'number' },
          disableImpersonation: { type: 'boolean' },
          metadata: { 
            type: 'object'
          },
          travelSchedules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                timeZone: { type: 'string' },
                endDate: { type: 'string' },
                startDate: { type: 'string' }
              }
            }
          },
          secondaryEmails: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                isDeleted: { type: 'boolean' }
              }
            }
          }
        }
      },
      response: {
        200: {
          description: 'User profile edited',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                username: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatarUrl: { type: ['string', 'null'] },
                hasEmailBeenChanged: { type: 'boolean' },
                sendEmailVerification: { type: 'boolean' },
              },
            },
          },
        },
        400: {
          description: "Bad Request",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
        401: {
          description: "Unauthorized",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
        409: {
          description: "Conflict - Email already in use",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const input = request.body as z.infer<typeof updateProfileBodySchema>;
      const userId = Number(request.user!.id);

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          emailVerified: true,
          metadata: true,
          timeZone: true,
          defaultScheduleId: true,
          teams: {
            select: { id: true }
          }
        }
      });

      if (!currentUser) {
        return ResponseFormatter.error(reply, 'User not found', 404);
      }

      // Handle username validation
      let isPremiumUsername = false;
      if (input.username && !(currentUser.metadata as any)?.organizationId) {
        const username = slugify(input.username);
        if (username !== currentUser.username) {
          const response = await checkUsername(username);
          isPremiumUsername = response.premium;
          if (!response.available) {
            return ResponseFormatter.error(reply, 'Username already taken', 400);
          }
        }
      }

      // Handle premium username validation
      if (isPremiumUsername) {
        const stripeCustomerId = (currentUser.metadata as any)?.stripeCustomerId;
        const isPremium = (currentUser.metadata as any)?.isPremium;
        
        if (!isPremium || !stripeCustomerId) {
          return ResponseFormatter.error(reply, 'User is not premium', 400);
        }

        try {
          const billingService = new StripeBillingService();
          const stripeSubscriptions = await billingService.getSubscriptions(stripeCustomerId);

          if (!stripeSubscriptions || !stripeSubscriptions.length) {
            return ResponseFormatter.error(reply, 'No stripe subscription found', 500);
          }

          // Check if premium username subscription is active
          const isPremiumUsernameSubscriptionActive = stripeSubscriptions.some(
            (subscription) =>
              subscription.items.data[0].price.id === getPremiumMonthlyPlanPriceId() &&
              subscription.status === "active"
          );

          if (!isPremiumUsernameSubscriptionActive) {
            return ResponseFormatter.error(reply, 'You need to pay for premium username', 400);
          }
        } catch (error) {
          console.error('Premium username validation error:', error);
          return ResponseFormatter.error(reply, 'Failed to validate premium username', 500);
        }
      }

      // Build update data
      const { travelSchedules, secondaryEmails, ...updateData } = input;
      const data: Prisma.UserUpdateInput = {
        ...updateData,
        metadata: input.metadata ? { ...(currentUser.metadata as any), ...input.metadata } : currentUser.metadata,
      };

      // Handle metadata header upload
      if (input.metadata?.headerUrl && 
          (input.metadata.headerUrl.startsWith("data:image/png;base64,") ||
           input.metadata.headerUrl.startsWith("data:image/jpeg;base64,") ||
           input.metadata.headerUrl.startsWith("data:image/jpg;base64,"))) {
        const headerUrl = await resizeBase64Image(input.metadata.headerUrl, { maxSize: 1500 });
        data.metadata = {
          ...(data.metadata as any),
          headerUrl: await uploadHeader({
            banner: headerUrl,
            userId: userId,
          })
        };
      } else if (input.metadata?.headerUrl === null) {
        // Handle removing header
        data.metadata = {
          ...(data.metadata as any),
          headerUrl: null
        };
      }

      // Handle avatar upload if it's a base64 image
      if (
        input.avatarUrl &&
        (input.avatarUrl.startsWith("data:image/png;base64,") ||
          input.avatarUrl.startsWith("data:image/jpeg;base64,") ||
          input.avatarUrl.startsWith("data:image/jpg;base64,"))
      ) {
        data.avatarUrl = await uploadAvatar({
          avatar: await resizeBase64Image(input.avatarUrl),
          userId: userId,
        });
      }

      // Handle booker layouts validation
      if (input.metadata?.defaultBookerLayouts) {
        const layoutError = validateBookerLayouts(input.metadata.defaultBookerLayouts);
        if (layoutError) {
          return ResponseFormatter.error(reply, layoutError, 400);
        }
      }

      // Handle completed onboarding
      if (input.completedOnboarding && currentUser.teams && currentUser.teams.length > 0) {
        await Promise.all(
          currentUser.teams.map(async (team) => {
            try {
              await updateNewTeamMemberEventTypes(userId, team.id);
            } catch (error) {
              console.error(`Failed to update team member event types for team ${team.id}:`, error);
              // Continue even if team update fails
            }
          })
        );
      }

      // Handle travel schedules
      if (input.travelSchedules) {
        const existingSchedules = await prisma.travelSchedule.findMany({
          where: { userId: userId },
        });

        const schedulesToDelete = existingSchedules.filter(
          (schedule) =>
            !input.travelSchedules!.find((scheduleInput) => scheduleInput.id === schedule.id)
        );

        if (schedulesToDelete.length > 0) {
          await prisma.travelSchedule.deleteMany({
            where: {
              userId: userId,
              id: { in: schedulesToDelete.map((schedule) => schedule.id) },
            },
          });
        }

        const newSchedules = input.travelSchedules
          .filter((schedule) => !schedule.id)
          .map((schedule) => ({
            userId: userId,
            startDate: new Date(schedule.startDate),
            endDate: schedule.endDate ? new Date(schedule.endDate) : null,
            timeZone: schedule.timeZone,
          }));

        if (newSchedules.length > 0) {
          await prisma.travelSchedule.createMany({
            data: newSchedules,
          });
        }
      }

      // Handle secondary emails
      if (input.secondaryEmails) {
        const recordsToDelete = input.secondaryEmails
          .filter((secondaryEmail) => secondaryEmail.isDeleted)
          .map((secondaryEmail) => secondaryEmail.id);

        if (recordsToDelete.length > 0) {
          await prisma.secondaryEmail.deleteMany({
            where: {
              id: { in: recordsToDelete },
              userId: userId,
            },
          });
        }

        const modifiedRecords = input.secondaryEmails.filter((secondaryEmail) => !secondaryEmail.isDeleted);
        if (modifiedRecords.length > 0) {
          const secondaryEmailsFromDB = await prisma.secondaryEmail.findMany({
            where: {
              id: { in: input.secondaryEmails.map((se) => se.id) },
              userId: userId,
            },
          });

          const recordsToModifyQueue = modifiedRecords.map((updated) => {
            const existingRecord = secondaryEmailsFromDB.find(se => se.id === updated.id);
            let emailVerified = existingRecord?.emailVerified || null;
            
            // If this is the secondary email being promoted to primary, use the primary email's verification status
            if (secondaryEmail?.id === updated.id) {
              emailVerified = currentUser.emailVerified;
            } else if (updated.email !== existingRecord?.email) {
              // If email changed, reset verification
              emailVerified = null;
            }

            return prisma.secondaryEmail.update({
              where: {
                id: updated.id,
                userId: userId,
              },
              data: {
                email: updated.email,
                emailVerified,
              },
            });
          });

          await prisma.$transaction(recordsToModifyQueue);
        }
      }

      // Handle email change verification
      const hasEmailBeenChanged = input.email && currentUser.email !== input.email;
      let secondaryEmail: { id: number; emailVerified: Date | null } | null = null;
      let sendEmailVerification = false;

      if (hasEmailBeenChanged) {
        const featuresRepository = new FeaturesRepository();
        const emailVerification = await featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

        if (emailVerification) {
          // Check if the new email is already a verified secondary email
          secondaryEmail = await prisma.secondaryEmail.findUnique({
            where: {
              email: input.email,
              userId: userId,
            },
            select: {
              id: true,
              emailVerified: true,
            },
          });

          if (secondaryEmail?.emailVerified) {
            // Use the verified secondary email
            data.emailVerified = secondaryEmail.emailVerified;
            
            // Add the old primary email as a secondary email
            if (!input.secondaryEmails) {
              input.secondaryEmails = [];
            }
            input.secondaryEmails.push({
              id: secondaryEmail.id,
              email: currentUser.email,
              isDeleted: false,
            });
          } else {
            // Set metadata to wait for verification
            data.metadata = {
              ...(data.metadata as any),
              emailChangeWaitingForVerification: input.email!.toLowerCase(),
            };
            // Don't include email in the update data yet
            delete data.email;
            sendEmailVerification = true;
          }
        } else {
          // Email verification disabled, update immediately
          data.emailVerified = null;
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          avatarUrl: true,
          metadata: true,
        },
      });

      // Handle timezone change for schedules
      if (input.timeZone && input.timeZone !== currentUser.timeZone) {
        const schedules = await prisma.schedule.findMany({
          where: { userId: userId },
        });

        if (schedules && schedules.length > 0) {
          try {
            const defaultScheduleId = await getDefaultScheduleId(userId, prisma);
            
            if (!currentUser.defaultScheduleId) {
              // Set default schedule if not already set
              await prisma.user.update({
                where: { id: userId },
                data: { defaultScheduleId },
              });
            }

            await prisma.schedule.updateMany({
              where: { id: defaultScheduleId },
              data: { timeZone: input.timeZone },
            });
          } catch (error) {
            console.error('Failed to update default schedule timezone:', error);
            // Continue even if schedule update fails
          }
        }
      }

      // Send email verification if needed
      if (hasEmailBeenChanged && sendEmailVerification) {
        try {
          await sendChangeOfEmailVerification({
            user: {
              username: currentUser.username || "Nameless User",
              emailFrom: currentUser.email,
              emailTo: input.email!,
            },
          });
        } catch (error) {
          console.error('Failed to send email verification:', error);
          // Continue with the update even if email verification fails
        }
      }

      // Notify Stripe about the change if user has stripe customer ID
      if (updatedUser && updatedUser.metadata && hasKeyInMetadata(updatedUser, "stripeCustomerId")) {
        try {
          const stripeCustomerId = `${updatedUser.metadata.stripeCustomerId}`;
          const billingService = new StripeBillingService();
          await billingService.updateCustomer({
            customerId: stripeCustomerId,
            email: updatedUser.email,
            userId: updatedUser.id,
          });
        } catch (error) {
          console.error('Failed to update Stripe customer:', error);
          // Continue even if Stripe update fails
        }
      }

      return ResponseFormatter.success(reply, {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
        hasEmailBeenChanged,
        sendEmailVerification,
      }, 'Profile updated successfully');

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const meta = error.meta as { target: string[] };
        if (meta.target.indexOf("email") !== -1) {
          return ResponseFormatter.error(reply, 'Email already in use', 409);
        }
      }

      console.error('Profile update error:', error);
      return ResponseFormatter.error(reply, 'Failed to update profile', 500);
    }
  });

  fastify.get<{ Params: { user: string } }>('/:user', { 
    schema: {
      description: 'Get user public events',
      tags: ['API Auth - Users'],
      response: {
        200: {
          description: 'User public events',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'array'
                }
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request, reply: FastifyReply) => {
    const { user } = request.params;

  const userProfiles = await userService.getUserEventsByUsernameString(user);

    const mappedProfiles = await Promise.all(userProfiles.map( async user => {
      return {
        name: user.name || user.username || "",
        events: await getEventTypesPublic(user.id),
        image: getUserAvatarUrl({
          avatarUrl: user.avatarUrl,
        }),
        theme: user.theme,
        brandColor: user.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
        avatarUrl: user.avatarUrl,
        darkBrandColor: user.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
        allowSEOIndexing: user.allowSEOIndexing ?? true,
        username: user.username,
        organization: user.profile.organization,
      }
    }))

    ResponseFormatter.success(reply, {users: mappedProfiles}, 'User public events retrieved');
  });
}
