import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { responseSchemas } from "@/schema/response";
import { userProfileSchema, updateProfileBodySchema, userProfileUpdateResponseSchema, userProfileQueryResponse, UserResponseSchema } from "@/schema/user.schema";
import { UserService } from '@/services/public/user.service';
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

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const userService = new UserService(prisma);
  // Route with specific auth methods allowed
  fastify.get('/me', { 
    schema: {
      description: 'Get current user profile',
      tags: ['Users'],
      security: [
        { bearerAuth: [] },
      ],
      response: {
        200: zodToJsonSchema(responseSchemas.success(UserResponseSchema, 'Current user profile')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
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
    
    ResponseFormatter.success(reply, userWithAuthContext, 'Current user profile');
  });

  fastify.put('/edit-profile', { 
    schema: {
      description: 'Edit user profile',
      tags: ['Users'],
      security: [
        { bearerAuth: [] },      ],
      body: zodToJsonSchema(updateProfileBodySchema.omit({avatarUrl: true})),
      response: {
        200: zodToJsonSchema(
          responseSchemas.success(
            userProfileUpdateResponseSchema,
            'Profile updated successfully'
          )
        ),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const input = updateProfileBodySchema.parse(request.body);
      const userId = Number(request.user!.id);

      const result = await userService.updateProfile(userId, input);
      return ResponseFormatter.success(reply, result, 'Profile updated successfully');

    } catch (error) {
      if (error instanceof z.ZodError) {
        return ResponseFormatter.error(reply, `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400);
      }

      console.error('Profile update error:', error);
      return ResponseFormatter.error(reply, 'Failed to update profile', 500);
    }
  });

  fastify.post('/edit-profile/avatar', {
    schema: {
      description: 'Upload avatar via multipart/form-data',
      tags: ['Users'],
      consumes: ['multipart/form-data'],
      security: [ { bearerAuth: [] },],
      body: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary', // <-- important: tells OpenAPI this is a file upload
        },
      },
      required: ['avatar'],
    },
      response: {
        200: zodToJsonSchema(
          responseSchemas.success(
            z.object({ avatarUrl: z.string() }),
            'Avatar updated successfully'
          )
        ),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Ensure multipart plugin is registered and file is present
      const file = await request.file();
      if (!file) {
        return ResponseFormatter.error(reply, 'No file uploaded', 400);
      }

      const allowedMimeTypes = new Set([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/svg+xml',
      ]);

      if (!allowedMimeTypes.has(file.mimetype)) {
        return ResponseFormatter.error(reply, 'Unsupported file type', 400);
      }

      const buffer: Buffer = await file.toBuffer();
      const dataUrl = `data:${file.mimetype};base64,${buffer.toString('base64')}`;

      const userId = Number(request.user!.id);
      const resized = await resizeBase64Image(dataUrl);
      const avatarUrl = await uploadAvatar({ avatar: resized, userId });

      await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

      return ResponseFormatter.success(reply, { avatarUrl }, 'Avatar updated successfully');
    } catch (error) {
      console.error('Avatar upload error:', error);
      return ResponseFormatter.error(reply, 'Failed to update avatar', 500);
    }
  });

  fastify.get<{ Params: { user: string } }>('/:user', { 
    schema: {
      description: 'Get user public events',
      tags: ['Users'],
      security: [ { bearerAuth: [] },],
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.array(userProfileSchema), 'User public events')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
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
        organizationId: user.profile.organizationId,
      }
    }))

    ResponseFormatter.success(reply, mappedProfiles, 'User public events retrieved');
  });
}
