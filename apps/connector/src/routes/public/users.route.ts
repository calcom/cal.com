import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { UserService } from '@/services/public/user.service';
import { AuthGuards, AuthRequest } from '@/auth/guards';
import { validateQuery, validateParams } from '@/middlewares/validation';
import { ResponseFormatter } from '@/utils/response';
import { commonSchemas } from '@/utils/validation';

const getUsersQuerySchema = z.object({
  ...commonSchemas.pagination.shape,
  email: z.string().optional(),
  search: z.string().optional(),
});

const getUserParamsSchema = z.object({
  id: commonSchemas.id,
});

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const userService = new UserService(fastify.prisma);
  // Route with specific auth methods allowed
  fastify.get('/me', {
    
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

  
}
