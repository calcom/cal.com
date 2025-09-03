import { FastifyInstance } from 'fastify';
import { userRoutes } from './users.route';
import { AuthGuards } from '@/auth';
import { eventTypeRoutes } from '@/routes/public/eventtypes.route';

export async function publicRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(userRoutes, { prefix: "/users" });
  await fastify.register(eventTypeRoutes, { prefix: "/event-types" });
  // Add more public route registrations here which need user authentication

}
