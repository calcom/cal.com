import { AvailabilityService } from '@/services/public/availability.service';
import { RescheduleBookingInput } from "@calcom/platform-types";
import { confirmHandler } from '@calcom/trpc/server/routers/viewer/bookings/confirm.handler';
import { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";
import getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import { GetUserAvailabilityResult } from '@calcom/lib/getUserAvailability';
import { bookingsQueryRequestSchema, bookingsQueryResponseSchema, createBookingBodySchema, bookingResponseSchema, getBookingParamsSchema, deleteBookingParamsSchema, cancelBookingBodySchema, cancelBookingParamsSchema, CancelBookingBody, singleBookingQueryResponseSchema } from '@/schema/booking.schema';
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
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingStatus } from "@calcom/prisma/enums";
import { UserService } from '@/services';

import {
  roundRobinReassignment,
  roundRobinManualReassignment,
} from "@calcom/platform-libraries";
import { CreationSource } from '@calcom/prisma/client';

export async function bookingRoutes(fastify: FastifyInstance): Promise<void> {
  const bookingService = new BookingService(prisma);
  const userService = new UserService(prisma)
  // Route with specific auth methods allowed
  fastify.get('/', {
    schema: {
      description: 'Get current user bookings',
      tags: ['Booking'],
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(bookingsQueryRequestSchema),
      response: {
        200: zodToJsonSchema(responseSchemas.paginated(bookingsQueryResponseSchema, 'User bookings retrieved')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const input = request.query as z.infer<typeof bookingsQueryRequestSchema>;
    const page = input.page ?? 1;
    const limit = input.limit ?? 100;
    const result = await bookingService.getUserBookings({
      ...input,
      page, limit
    }, { id: Number.parseInt(request.user!.id), email: request.user!.email, orgId: request.organizationId, });



    ResponseFormatter.paginated(
      reply,
      (result as any).bookings ?? [],
      page,
      limit,
      (result as any).totalCount ?? 0,
      'User bookings retrieved'
    );
  })

  // Public route to create a new booking
  fastify.post('/', {
    schema: {
      description: 'Create a new booking',
      tags: ['Booking'],
      body: zodToJsonSchema(createBookingBodySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(bookingResponseSchema, 'Booking created')),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        500: zodToJsonSchema(responseSchemas.error('Internal Server Error')),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {

    try {

      // const userId = Number.parseInt(request.user!.id);

       const parseResult = createBookingBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return ResponseFormatter.error(reply, `Validation failed: ${parseResult.error.errors[0].message}`, 400);
      }
      const body = parseResult.data;
      

      // const platformClientParams = await bookingService.getOAuthClientParamsByUserId(userId);

      const booking = await handleNewBooking({
      bookingData: {...body,
        CreationSource: "API"
      } as Record<string, unknown>,

      userId:-1,
      // platformClientId: platformClientParams?.platformClientId,
      // platformRescheduleUrl: platformClientParams?.platformRescheduleUrl ?? undefined,
      // platformCancelUrl: platformClientParams?.platformCancelUrl ?? undefined,
      // platformBookingUrl: platformClientParams?.platformBookingUrl ?? undefined,
      });

      ResponseFormatter.success(reply, booking, 'Booking created');
    } catch (error) {
      console.log("Error: ", error)
      const message = error instanceof Error ? error.message : 'Failed to create booking';
      ResponseFormatter.error(reply, message);
    }
  })

  // Get booking by id
  fastify.get('/:id', {
    schema: {
      description: 'Get booking by id',
      tags: ['Booking'],
      security: [{ bearerAuth: [] }],
      // params: zodToJsonSchema(z.object({ id: z.union([z.string(), z.number()]) })),
      // querystring: zodToJsonSchema(z.object({ expand: z.union([z.string(), z.array(z.string())]).optional() })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(singleBookingQueryResponseSchema, 'Booking')), // refined below after parsing
        404: zodToJsonSchema(responseSchemas.notFound('Booking not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const rawParams = { ...(request.params as any), ...(request.query as any) };
    const parse = getBookingParamsSchema.safeParse({ id: rawParams.id });
    if (!parse.success) {
      return ResponseFormatter.error(reply, `Validation failed: ${parse.error.errors[0].message}`, 400);
    }

    const { id, expand } = parse.data;

    const userId = Number.parseInt(request.user!.id);

    // Check if event type exists and belongs to user
    const bookingExists = await bookingService.bookingExists(userId, id);
    if (!bookingExists) {
      return ResponseFormatter.notFound(reply, "Booking not found");
    }

    const booking = await bookingService.getBookingById(id);
    if (!booking) {
      return ResponseFormatter.error(reply, 'Booking not found', 404);
    }

    ResponseFormatter.success(reply, booking, 'Booking');
  })


  // Cancel booking
  fastify.post('/:id/cancel', {
    schema: {
      description: 'Cancel booking by id',
      tags: ['Booking'],
      security: [{ bearerAuth: [] }],
      params: zodToJsonSchema(cancelBookingParamsSchema),
      body: zodToJsonSchema(cancelBookingBodySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(
          z.object({
            success: z.literal(true),
            message: z.string(),
            onlyRemovedAttendee: z.boolean(),
            bookingId: z.number().int(),
            bookingUid: z.string(),
          }),
          'Booking cancelled'
        )),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    // Parse and validate
    const parseParams = cancelBookingParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return ResponseFormatter.error(
        reply,
        `Validation failed: ${parseParams.error.errors[0].message}`,
        400
      );
    }
    const { id } = parseParams.data;

    const parseBody = cancelBookingBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return ResponseFormatter.error(
        reply,
        `Validation failed: ${parseBody.error.errors[0].message}`,
        400
      );
    }
    const body = parseBody.data;

    const userId = Number.parseInt(request.user!.id);
    const bookingExists = await bookingService.bookingExists(userId, id);
    if (!bookingExists) {
      return ResponseFormatter.notFound(reply, "Booking not found");
    }

    const headers = request.headers as Record<string, string | undefined>;
    const platformClientId = headers['x-cal-client-id'] || undefined;
    const platformEmbed = headers['x-cal-platform-embed'] || undefined;
    const arePlatformEmailsEnabled = platformEmbed === '1' ? false : true;

    try {
      const result = await handleCancelBooking({
        bookingData: { id, ...body, fromApi: true },
        userId,
        platformClientId,
        platformRescheduleUrl: undefined,
        platformCancelUrl: undefined,
        platformBookingUrl: undefined,
        arePlatformEmailsEnabled,
      });

      ResponseFormatter.success(reply, result, 'Booking cancelled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel booking';
      ResponseFormatter.error(reply, message, 400);
    }
  });

  fastify.patch('/:id/change_confirmation', {
    schema: {
      description: 'Change booking confirmation status (accept or decline)',
      tags: ['Booking'],
      security: [{ bearerAuth: [] }],
      // params: zodToJsonSchema(z.object({ id: z.union([z.string(), z.number()]) })),
      body: zodToJsonSchema(bookingConfirmPatchBodySchema.omit({ bookingId: true, platformClientParams: true, emailsEnabled: true })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.object({
          message: z.string(),
          status: z.string(),
          bookingId: z.number(),
        }), 'Booking status changed')),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        404: zodToJsonSchema(responseSchemas.notFound('Booking not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const idRaw = (request.params as any)?.id;
      const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;

      if (!Number.isInteger(id) || id <= 0) {
        return ResponseFormatter.error(reply, 'Validation failed: id must be a positive integer', 400);
      }

      const userId = Number.parseInt(request.user!.id);
      // Check if event type exists and belongs to user
      const bookingExists = await bookingService.bookingExists(userId, id);
      if (!bookingExists) {
        return ResponseFormatter.notFound(reply, "Booking not found");
      }

      const parsed = bookingConfirmPatchBodySchema.omit({ bookingId: true }).safeParse(request.body);
      if (!parsed.success) {
        return ResponseFormatter.error(reply, `Validation failed: ${parsed.error.errors[0].message}`, 400);
      }

      const body = parsed.data;
      const { confirmed } = body;

      // Validate that confirmed is a boolean
      if (typeof confirmed !== 'boolean') {
        return ResponseFormatter.error(reply, 'Validation failed: confirmed must be a boolean', 400);
      }

      const result = await confirmHandler({
        ctx: {
          user: request.user!
        },
        input: {
          ...parsed.data,
          bookingId: id,
        }
      })

      return ResponseFormatter.success(reply, {
        status: result.status,
        message: result.message,
        bookingId: id,
      }, 'Booking confirmation status updated');
    } catch (error) {
      console.error('Error changing booking confirmation:', error);
      const message = error instanceof Error ? error.message : 'Failed to change booking confirmation';
      ResponseFormatter.error(reply, message, 500);
    }
  })

  fastify.patch('/:id/reassignBookingAutomatically', {
    schema: {
      description: 'Reassign booking to automatically via round robin',
      tags: ['Booking'],
      security: [{ bearerAuth: [] }],
      // params: zodToJsonSchema(z.object({ id: z.union([z.string(), z.number()]) })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.object({
          bookingId: z.number(),
        }), 'Booking reassigned')),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        404: zodToJsonSchema(responseSchemas.notFound('Booking not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const idRaw = (request.params as any)?.id;
    const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;

    const userId = Number.parseInt(request.user!.id);

    // Check if event type exists and belongs to user
    const bookingExists = await bookingService.bookingExists(userId, id);
    if (!bookingExists) {
      return ResponseFormatter.notFound(reply, "Booking not found");
    }

    const booking = await bookingService.getBookingById(Number(id));
    if (!booking) {
      return ResponseFormatter.error(reply, 'Booking not found', 404);
    }

    const platformClientParams = booking.eventTypeId
      ? await bookingService.getOAuthClientParams(booking.eventTypeId)
      : undefined;

    const emailsEnabled = platformClientParams ? platformClientParams.arePlatformEmailsEnabled : true;

    const user = await userService.getUserById(userId);

    try {
      await roundRobinReassignment({
        bookingId: booking.id,
        orgId: user.organizationId || null,
        emailsEnabled,
        platformClientParams,
        reassignedById: userId,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "no_available_users_found_error") {
          return ResponseFormatter.error(reply, 'No available users found for reassignment', 400);
        }
      }
      throw error;
    }

    // const reassigned = await this.bookingsRepository.getByUidWithUser(bookingUid);
    // if (!reassigned) {
    //   throw new NotFoundException(`Reassigned booking with uid=${bookingUid} was not found in the database`);
    // }

    // return this.outputService.getOutputReassignedBooking(reassigned);

    const newBooking = await bookingService.getBookingById(Number(id));

    if (!newBooking) {
      return ResponseFormatter.error(reply, 'Booking not reassigned', 500);
    }

    return ResponseFormatter.success(reply, {
      newUserId: newBooking.userId,
      bookingId: newBooking.id,
    }, 'Booking reassigned');
  })

  fastify.patch('/:id/reassignBookingToUser', {
    schema: {
      description: 'Reassign booking to a certain user',
      tags: ['Booking'],
      security: [{ bearerAuth: [] }],
      // params: zodToJsonSchema(z.object({ id: z.union([z.string(), z.number()]) })),
      body: zodToJsonSchema(z.object({
        userId: z.number().int().positive(),
        reason: z.string().optional(),
      })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.object({
          newUserId: z.number(),
          bookingId: z.number(),
        }), 'Booking reassigned')),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        404: zodToJsonSchema(responseSchemas.notFound('Booking not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const idRaw = (request.params as any)?.id;
    const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;

    const userId = Number.parseInt(request.user!.id);
    const newUserId = (request.body as any)?.userId;
    if (!newUserId || typeof newUserId !== 'number' || newUserId <= 0) {
      return ResponseFormatter.error(reply, 'Validation failed: userId must be a positive integer', 400);
    }

    const booking = await bookingService.getBookingById(Number(id));
    if (!booking) {
      return ResponseFormatter.error(reply, 'Booking not found', 404);
    }

    //TODO: IMPLEMENT OAUTH CLIENT FIRST
    const platformClientParams = booking.eventTypeId
      ? await bookingService.getOAuthClientParams(booking.eventTypeId)
      : undefined;

    const emailsEnabled = platformClientParams ? platformClientParams.arePlatformEmailsEnabled : true;

    const user = await userService.getUserById(userId);

    try {
      await roundRobinManualReassignment({
        bookingId: booking.id,
        newUserId,
        orgId: user?.organizationId || null,
        reassignReason: (request.body as any)?.reason,
        reassignedById: userId,
        emailsEnabled,
        platformClientParams,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "no_available_users_found_error") {
          return ResponseFormatter.error(reply, 'No available users found for reassignment', 400);
        }
      }
      throw error;
    }

    // const reassigned = await this.bookingsRepository.getByUidWithUser(bookingUid);
    // if (!reassigned) {
    //   throw new NotFoundException(`Reassigned booking with uid=${bookingUid} was not found in the database`);
    // }

    // return this.outputService.getOutputReassignedBooking(reassigned);

    const newBooking = await bookingService.getBookingById(Number(id));

    if (!newBooking) {
      return ResponseFormatter.error(reply, 'Booking not reassigned', 500);
    }

    return ResponseFormatter.success(reply, {
      newUserId: newBooking.userId,
      bookingId: newBooking.id,
    }, 'Booking reassigned');
  })

  fastify.patch('/:id/reschedule', {
    schema: {
      description: 'Reschedule booking by id',
      tags: ['Booking'],
      // params: zodToJsonSchema(z.object({ id: z.union([z.string(), z.number()]) })),
      body: zodToJsonSchema(z.object({
        start: z.string().min(1),
        reschedulingReason: z.string().optional(),
        rescheduledBy: z.string().email().optional(),
        seatUid: z.string().optional(),
      })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.object({
          newUserId: z.number(),
          bookingId: z.number(),
        }), 'Booking reassigned')),
        400: zodToJsonSchema(responseSchemas.badRequest()),
        404: zodToJsonSchema(responseSchemas.notFound('Booking not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const idRaw = (request.params as any)?.id;
    const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;

    const userId = Number.parseInt(request.user!.id);

    const booking = await bookingService.getBookingById(Number(id));
    if (!booking) {
      return ResponseFormatter.error(reply, 'Booking not found', 404);
    }

    const platformClientParams = booking.eventTypeId
      ? await bookingService.getOAuthClientParams(booking.eventTypeId)
      : undefined;

    const emailsEnabled = platformClientParams ? platformClientParams.arePlatformEmailsEnabled : true;

    const user = await userService.getUserById(userId);

    try {
      const bookingRequest = await bookingService.buildRescheduleBookingRequest({
        originalBookingId: Number(id),
        body: request.body as any,
        headers: request.headers as Record<string, string | undefined>,
      });

      await handleNewBooking({
        bookingData: bookingRequest.body,
        userId: bookingRequest.userId ?? -1,
        hostname: bookingRequest.headers?.host || "",
        platformClientId: bookingRequest.platformClientId,
        platformRescheduleUrl: bookingRequest.platformRescheduleUrl,
        platformCancelUrl: bookingRequest.platformCancelUrl,
        platformBookingUrl: bookingRequest.platformBookingUrl,
        platformBookingLocation: bookingRequest.platformBookingLocation,
        areCalendarEventsEnabled: bookingRequest.areCalendarEventsEnabled,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "no_available_users_found_error") {
          return ResponseFormatter.error(reply, 'Conflicting reschedule', 400);
        }
      }
      throw error;
    }

    // const reassigned = await this.bookingsRepository.getByUidWithUser(bookingUid);
    // if (!reassigned) {
    //   throw new NotFoundException(`Reassigned booking with uid=${bookingUid} was not found in the database`);
    // }

    // return this.outputService.getOutputReassignedBooking(reassigned);

    const newBooking = await bookingService.getBookingById(Number(id));

    if (!newBooking) {
      return ResponseFormatter.error(reply, 'Booking not rescheduled', 500);
    }

    return ResponseFormatter.success(reply, {
      bookingId: newBooking.id,
    }, 'Booking rescheduled');
  })
}