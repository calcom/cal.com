import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { z } from 'zod';
import { UserService } from '@/services/public';
import { AuthGuards, AuthRequest } from '@/auth/guards';
import { validateQuery, validateParams } from '@/middlewares/validation';
import { ResponseFormatter } from '@/utils/response';
import { commonSchemas } from '@/utils/validation';
import prisma from "@calcom/prisma";

const getUsersQuerySchema = z.object({
  ...commonSchemas.pagination.shape,
  email: z.string().optional(),
  search: z.string().optional(),
});

const getUserParamsSchema = z.object({
  id: commonSchemas.id,
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
