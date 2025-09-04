import { FastifyInstance } from 'fastify';
import { userRoutes } from './users.route';
import { eventTypeRoutes } from '@/routes/public/eventtypes.route';
import { teamRoutes } from '@/routes/public/team.route';

export async function publicRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(userRoutes, { prefix: "/users" });
  await fastify.register(eventTypeRoutes, { prefix: "/event-types" });
  await fastify.register(teamRoutes, { prefix: "/teams" });

  // Add more public route registrations here which need user authentication

}
