import { AvailabilityService } from '@/services/public/availability.service';
import getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import { GetUserAvailabilityResult } from '@calcom/lib/getUserAvailability';
import { bookingsQuerySchema, createBookingBodySchema, bookingResponseSchema } from '@/schema/booking.schema';
import { getUserAvailability } from "@calcom/lib/getUserAvailability";
import { responseSchemas } from "@/schema/response";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { BookingService } from '@/services/public/booking.service';

import { AuthGuards, AuthRequest } from '@/auth/guards';
import { ResponseFormatter } from '@/utils/response';
import prisma from "@calcom/prisma";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";

export async function bookingRoutes(fastify: FastifyInstance): Promise<void> {
  const bookingService = new BookingService(prisma);
  // Route with specific auth methods allowed
  fastify.get('/all-bookings', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Get current user availability',
      tags: ['API Auth - Users'],
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
      querystring: zodToJsonSchema(bookingsQuerySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.any(), 'Current user availability')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
      const input = request.query as z.infer<typeof bookingsQuerySchema>;

      const bookings = await bookingService.getUserBookings(input, { id: Number.parseInt(request.user!.id), email: request.user!.email, orgId: request.organizationId });

      ResponseFormatter.success(reply, bookings, 'User availability retrieved');
      // return {availability: data}
  })

  // Public route to create a new booking
  fastify.post('/book', {
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Create a new booking',
      tags: ['Public - Bookings'],
      body: zodToJsonSchema(createBookingBodySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(bookingResponseSchema, 'Booking created')),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        500: zodToJsonSchema(responseSchemas.error('Internal Server Error')),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    console.log('Content-Type:', request.headers['content-type']);
    console.log('Raw body:', request.body);
    console.log('Body type:', typeof request.body);
    console.log('Body constructor:', request.body?.constructor?.name);

    try {
      const parseResult = createBookingBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        console.log('Zod validation errors:', JSON.stringify(parseResult.error.errors, null, 2));
        return ResponseFormatter.error(reply, `Validation failed: ${parseResult.error.errors[0].message}`, 400);
      }
      const body = parseResult.data;

      const headers = request.headers as Record<string, string | undefined>;

      const platformClientId = headers['x-cal-client-id'] || undefined;
      const forcedSlug = (headers['x-cal-force-slug'] || (body?.orgSlug as string | undefined)) ?? undefined;
      const platformEmbed = headers['x-cal-platform-embed'] || undefined;
      const areCalendarEventsEnabled = platformEmbed === '1' ? false : true;

      // Optional platform location override (mirrors API controller usage)
      const platformBookingLocation = (body?.locationUrl as string | undefined) ?? undefined;

      console.log("Got here")

      const booking = await handleNewBooking({
        bookingData: body as Record<string, unknown>,
        userId: -1, // public route; no authenticated user context
        hostname: headers.host || '',
        forcedSlug,
        platformClientId,
        platformRescheduleUrl: (body?.platformRescheduleUrl as string | undefined) ?? undefined,
        platformCancelUrl: (body?.platformCancelUrl as string | undefined) ?? undefined,
        platformBookingUrl: (body?.platformBookingUrl as string | undefined) ?? undefined,
        platformBookingLocation,
        areCalendarEventsEnabled,
      },
      getBookingDataSchemaForApi
    );

      ResponseFormatter.success(reply, booking, 'Booking created');
    } catch (error) {
      console.log("Error: ", error)
      const message = error instanceof Error ? error.message : 'Failed to create booking';
      ResponseFormatter.error(reply, message);
  }})
}