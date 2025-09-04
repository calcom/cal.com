import { SlotsRepository } from "@/repositories/slots.repository";
import { z } from "zod";
import { slotsQuerySchema, reservationBodySchema } from "@/schema/slots.schema";

import { PrismaClient } from "@calcom/prisma";

import { BaseService } from "../base.service";


export class SlotsService extends BaseService {
  private slotsRepository: SlotsRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.slotsRepository = new SlotsRepository(prisma);
  }

  async getAvailableSlots(params: z.infer<typeof slotsQuerySchema>) {
    return this.slotsRepository.getAvailableSlots(params);
  }

  async reserveSlot(body: z.infer<typeof reservationBodySchema>, authUserId?: number) {
    // Auth rule
    if (body.reservationDuration && !authUserId) {
      throw new Error("reservationDuration can only be used for authenticated requests");
    }

    const DEFAULT_RESERVATION_DURATION_MIN = 5;

    const eventType = await this.slotsRepository.getEventTypeWithHosts(body.eventTypeId);
    if (!eventType) {
      throw new Error(`Event Type with ID=${body.eventTypeId} not found`);
    }

    // Parse and validate dates
    const slotStart = new Date(body.slotStart);
    if (isNaN(slotStart.getTime())) {
      throw new Error("Invalid start date");
    }

    const slotDurationMinutes = typeof body.slotDuration === "string"
      ? Number.parseInt(body.slotDuration, 10)
      : Number(body.slotDuration);

    if (slotDurationMinutes) {
      const metadata = (eventType as any)?.metadata ?? null;
      const possibleDurations: number[] | undefined = metadata?.multipleDuration;
      if (!possibleDurations) {
        throw new Error("You passed 'slotDuration' but this event type is not a variable length event type.");
      }
      if (!possibleDurations.includes(slotDurationMinutes)) {
        throw new Error(
          `Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths are: ${possibleDurations.join(", ")}`
        );
      }
    }

    const effectiveDuration = slotDurationMinutes || eventType.length;
    const slotEnd = new Date(slotStart.getTime() + effectiveDuration * 60 * 1000);
    if (isNaN(slotEnd.getTime())) {
      throw new Error("Invalid end date");
    }

    // Overlap with bookings
    const overlappingBooking = await this.slotsRepository.findActiveOverlappingBooking(
      body.eventTypeId,
      slotStart,
      slotEnd
    );

    if (eventType.seatsPerTimeSlot) {
      const attendeesCount = overlappingBooking?.attendees?.length || 0;
      const seatsLeft = eventType.seatsPerTimeSlot - attendeesCount;
      if (seatsLeft < 1) {
        throw new Error("Booking has no more seats left");
      }
    } else if (overlappingBooking) {
      throw new Error("Can't reserve a slot if the event is already booked.");
    }

    // Overlap with active reservations
    const existingReservation = await this.slotsRepository.getOverlappingSlotReservation(
      body.eventTypeId,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      new Date()
    );
    if (existingReservation) {
      throw new Error("This time slot is already reserved by another user. Please choose a different time.");
    }

    const reservationDuration = body.reservationDuration || DEFAULT_RESERVATION_DURATION_MIN;

    // Determine owner
    const ownerUserId = eventType.userId ?? eventType.hosts?.[0]?.userId;
    if (!ownerUserId) {
      throw new Error("Cannot reserve a slot for a team event without any hosts");
    }

    const reservationUntilISO = new Date(Date.now() + reservationDuration * 60 * 1000).toISOString();

    const reservation = await this.slotsRepository.createSelectedSlot(
      ownerUserId,
      eventType.id,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      eventType.seatsPerTimeSlot !== null,
      reservationUntilISO
    );

    return {
      eventTypeId: eventType.id,
      slotStart: slotStart.toISOString(),
      slotEnd: slotEnd.toISOString(),
      slotDuration: effectiveDuration,
      reservationUid: reservation.uid,
      reservationDuration,
      reservationUntil: reservationUntilISO,
    };
  }

  async editSlot(
    reservationUid: string, 
    body: z.infer<typeof reservationBodySchema>, 
    authUserId?: number
  ) {
    // Auth rule
    if (body.reservationDuration && !authUserId) {
      throw new Error("reservationDuration can only be used for authenticated requests");
    }
  
    const DEFAULT_RESERVATION_DURATION_MIN = 5;
  
    // Get existing reservation
    const existingReservation = await this.slotsRepository.getSelectedSlotByUid(reservationUid);
    if (!existingReservation) {
      throw new Error(`Reservation with UID=${reservationUid} not found`);
    }
  
    // Optional: Check if user owns this reservation (if auth is enabled)
    if (authUserId && existingReservation.userId !== authUserId) {
      throw new Error("You can only edit your own reservations");
    }
  
    const eventType = await this.slotsRepository.getEventTypeWithHosts(body.eventTypeId);
    if (!eventType) {
      throw new Error(`Event Type with ID=${body.eventTypeId} not found`);
    }
  
    // Validate that the eventType matches the existing reservation
    if (existingReservation.eventTypeId !== body.eventTypeId) {
      throw new Error("Cannot change event type when editing a reservation");
    }
  
    // Parse and validate dates
    const slotStart = new Date(body.slotStart);
    if (isNaN(slotStart.getTime())) {
      throw new Error("Invalid start date");
    }
  
    const slotDurationMinutes = typeof body.slotDuration === "string"
      ? Number.parseInt(body.slotDuration, 10)
      : Number(body.slotDuration);
  
    if (slotDurationMinutes) {
      const metadata = (eventType as any)?.metadata ?? null;
      const possibleDurations: number[] | undefined = metadata?.multipleDuration;
      if (!possibleDurations) {
        throw new Error("You passed 'slotDuration' but this event type is not a variable length event type.");
      }
      if (!possibleDurations.includes(slotDurationMinutes)) {
        throw new Error(
          `Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths are: ${possibleDurations.join(", ")}`
        );
      }
    }
  
    const effectiveDuration = slotDurationMinutes || eventType.length;
    const slotEnd = new Date(slotStart.getTime() + effectiveDuration * 60 * 1000);
  
    if (isNaN(slotEnd.getTime())) {
      throw new Error("Invalid end date");
    }
  
    // Check if new time conflicts with existing bookings
    const overlappingBooking = await this.slotsRepository.findActiveOverlappingBooking(
      body.eventTypeId,
      slotStart,
      slotEnd
    );
  
    if (eventType.seatsPerTimeSlot) {
      const attendeesCount = overlappingBooking?.attendees?.length || 0;
      const seatsLeft = eventType.seatsPerTimeSlot - attendeesCount;
      if (seatsLeft < 1) {
        throw new Error("Booking has no more seats left");
      }
    } else if (overlappingBooking) {
      throw new Error("Can't edit slot to this time as the event is already booked.");
    }
  
    // Check for overlapping reservations (excluding the current one being edited)
    const conflictingReservation = await this.slotsRepository.getOverlappingSlotReservation(
      body.eventTypeId,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      new Date(),
    );
  
    if (conflictingReservation) {
      throw new Error("This time slot is already reserved by another user. Please choose a different time.");
    }
  
    const reservationDuration = body.reservationDuration || DEFAULT_RESERVATION_DURATION_MIN;
    const reservationUntilISO = new Date(Date.now() + reservationDuration * 60 * 1000).toISOString();


    // Determine owner
    const ownerUserId = eventType.userId ?? eventType.hosts?.[0]?.userId;
    if (!ownerUserId) {
      throw new Error("Cannot reserve a slot for a team event without any hosts");
    }

  
    // Update the existing reservation
    const updatedReservation = await this.slotsRepository.updateSelectedSlot(
      existingReservation.id,
      ownerUserId,
      eventType.id,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      eventType.seatsPerTimeSlot !== null,
      reservationUntilISO
    );
  
    return {
      eventTypeId: eventType.id,
      slotStart: slotStart.toISOString(),
      slotEnd: slotEnd.toISOString(),
      slotDuration: effectiveDuration,
      reservationUid: updatedReservation.uid,
      reservationDuration,
      reservationUntil: reservationUntilISO,
    };
  }

  async getSelectedSlotByUid(uid: string) {
    return this.slotsRepository.getSelectedSlotByUid(uid);
  }

  async deleteSelectedSlotByUid(uid: string) {
    return this.slotsRepository.deleteSelectedSlotByUid(uid);
  }
}
