import { FastifyInstance } from 'fastify';
import { userRoutes } from './users.route';
import { AuthGuards } from '@/auth';

export async function publicRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("preHandler", AuthGuards.authenticateFlexible());
  
  await fastify.register(userRoutes, { prefix: '/users' });
}