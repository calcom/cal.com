import { FastifyInstance } from 'fastify';
import { availabilityRoutes } from './availability.route';
import { AuthGuards } from '@/auth';
import { userRoutes } from './users.route';
import { eventTypeRoutes } from '@/routes/public/eventtypes.route';
import { teamRoutes } from '@/routes/public/team.route';

export async function publicRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(userRoutes, { prefix: "/users" });
  await fastify.register(eventTypeRoutes, { prefix: "/event-types" });
  await fastify.register(teamRoutes, { prefix: "/teams" });
  await fastify.register(availabilityRoutes, { prefix: '/availability' });
}
